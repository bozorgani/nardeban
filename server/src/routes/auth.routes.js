import { Router } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';
import { sendOtp } from '../services/sms.js';
import { JWT_SECRET } from '../config/env.js';
import { generateOtp, hashOtp, safeEqualHash } from '../utils/otp.js';
import { TOKEN_COOKIE, tokenCookieOptions, getTokenFromReq } from '../utils/token.js';

const router = Router();

const isProd = process.env.NODE_ENV === 'production';

// ضد brute-force per-phone (SEC-07): پس از این تعداد تلاش ناموفق، شماره موقتاً قفل می‌شود
const MAX_VERIFY_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

const sign = (user) =>
  jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '30d' });

// مرحله ۱: درخواست کد تایید
router.post('/request-otp', async (req, res, next) => {
  try {
    const { phone } = req.body;
    if (!/^09\d{9}$/.test(phone || ''))
      return res.status(400).json({ message: 'شماره موبایل معتبر نیست (مثال: 09123456789)' });

    const code = generateOtp(); // کد ۶ رقمی امن (SEC-07)
    const expires = new Date(Date.now() + 5 * 60 * 1000);

    // چاپ کد خام در لاگ سرور (برای دیباگ) — قبل از هش‌شدن.
    // فقط در غیرپروداکشن، یا اگر صراحتاً LOG_OTP=true باشد (دیباگ موقت).
    // ⚠️ در پروداکشن این را روشن نگذارید؛ کد در لاگ‌ها امن نیست.
    if (!isProd || process.env.LOG_OTP === 'true') {
      console.log(`🔑 [OTP] کد ${phone}: ${code}  (انقضا: ${expires.toLocaleTimeString('fa-IR')})`);
    }

    await User.findOneAndUpdate(
      { phone },
      {
        phone,
        otpHash: hashOtp(code, phone), // فقط هش ذخیره می‌شود (SEC-08)
        otpExpires: expires,
        otpAttempts: 0, // ریست شمارندهٔ تلاش با هر کد جدید
        otpLockedUntil: null,
      },
      { upsert: true, new: true }
    );

    // ارسال کد با سرویس پیامک. در پروداکشن باید ارائه‌دهنده تنظیم شده باشد؛
    // در غیر این صورت sendOtp خطا می‌دهد و کد هرگز در پاسخ لو نمی‌رود (SEC-01).
    let delivered = false;
    try {
      ({ delivered } = await sendOtp(phone, code));
    } catch (smsErr) {
      console.error('❌ خطای ارسال پیامک:', smsErr.message);
      if (isProd) {
        return res
          .status(503)
          .json({ message: 'ارسال پیامک در حال حاضر ممکن نیست. لطفاً بعداً تلاش کنید.' });
      }
      // در توسعه: ادامه بده تا کد در پاسخ برگردد (delivered=false)
    }

    const payload = { message: 'کد تایید ارسال شد' };
    // کد فقط در توسعه و فقط وقتی پیامک واقعی ارسال نشده برمی‌گردد (کمک به تست محلی).
    // در پروداکشن تحت هیچ شرایطی کد در پاسخ قرار نمی‌گیرد.
    if (!isProd && !delivered) payload.demoCode = code;

    res.json(payload);
  } catch (err) {
    next(err);
  }
});

// مرحله ۲: تایید کد و دریافت توکن
router.post('/verify-otp', async (req, res, next) => {
  try {
    const { phone, code } = req.body;
    const user = await User.findOne({ phone }).select(
      '+otpHash +otpExpires +otpAttempts +otpLockedUntil'
    );
    if (!user) return res.status(400).json({ message: 'ابتدا درخواست کد دهید' });

    // قفل موقت per-phone (SEC-07) — قبل از هر چیز دیگر بررسی می‌شود
    if (user.otpLockedUntil && user.otpLockedUntil > new Date()) {
      const mins = Math.ceil((user.otpLockedUntil - Date.now()) / 60000);
      return res
        .status(429)
        .json({ message: `تلاش‌های ناموفق زیاد — ${mins} دقیقه دیگر دوباره کد بگیرید` });
    }

    if (!user.otpHash)
      return res.status(400).json({ message: 'ابتدا درخواست کد دهید' });

    if (user.otpExpires < new Date())
      return res.status(400).json({ message: 'کد منقضی شده است' });

    const ok = safeEqualHash(hashOtp(String(code), phone), user.otpHash);
    if (!ok) {
      // ⚛️ افزایش اتمیک شمارندهٔ تلاش ناموفق (رفع Race Condition).
      // قبلاً read-modify-write بود: ۱۰۰ درخواست همزمان همگی 0 می‌خواندند و 1
      // می‌نوشتند (last-write-wins) و شمارنده هرگز به سقف نمی‌رسید.
      // با $inc اتمیک، هر درخواست مقدار یکتا (1,2,3,...) می‌گیرد و قفل قطعی می‌شود.
      const updated = await User.findOneAndUpdate(
        { _id: user._id },
        { $inc: { otpAttempts: 1 } },
        { new: true, select: '+otpAttempts' }
      );
      const attempts = updated?.otpAttempts ?? MAX_VERIFY_ATTEMPTS;

      if (attempts >= MAX_VERIFY_ATTEMPTS) {
        // عبور از سقف → قفل و باطل‌کردن کد فعلی (به‌صورت اتمیک، idempotent).
        await User.updateOne(
          { _id: user._id },
          {
            $set: { otpLockedUntil: new Date(Date.now() + LOCK_MINUTES * 60 * 1000) },
            $unset: { otpHash: '', otpExpires: '' },
          }
        );
        return res.status(429).json({
          message: `تلاش‌های ناموفق زیاد — ${LOCK_MINUTES} دقیقه دیگر دوباره کد بگیرید`,
        });
      }
      const left = MAX_VERIFY_ATTEMPTS - attempts;
      return res
        .status(400)
        .json({ message: `کد اشتباه است (${left} تلاش باقی مانده)` });
    }

    // ✅ موفق — باطل‌کردن کد و ریست شمارنده‌ها به‌صورت اتمیک.
    // از findOneAndUpdate با شرط otpHash موجود استفاده می‌کنیم تا فقط یک درخواست
    // همزمان «برنده» شود (اگر دو درخواست هم‌زمان با کد درست بیایند، فقط اولی
    // کد را مصرف می‌کند و دومی کد را باطل‌شده می‌بیند).
    const consumed = await User.findOneAndUpdate(
      { _id: user._id, otpHash: { $ne: null } },
      {
        $set: { otpAttempts: 0, otpLockedUntil: null },
        $unset: { otpHash: '', otpExpires: '' },
      },
      { new: true }
    );
    if (!consumed) {
      // کد توسط درخواست همزمان دیگری مصرف شده یا منقضی شده است.
      return res.status(400).json({ message: 'کد منقضی شده است' });
    }

    const token = sign(consumed);
    // توکن در کوکی HttpOnly ست می‌شود (SEC-04) — برای مرورگر، غیرقابل دسترس به JS.
    res.cookie(TOKEN_COOKIE, token, tokenCookieOptions());

    res.json({
      // token برای سازگاری با کلاینت‌های غیرمرورگری/SSR هم برگردانده می‌شود،
      // ولی کلاینت مرورگری دیگر آن را در localStorage ذخیره نمی‌کند (از کوکی استفاده می‌شود).
      token,
      user: { id: consumed._id, phone: consumed.phone, name: consumed.name, city: consumed.city, role: consumed.role },
    });
  } catch (err) {
    next(err);
  }
});

// خروج — پاک‌کردن کوکی توکن (SEC-04)
router.post('/logout', (_req, res) => {
  res.clearCookie(TOKEN_COOKIE, { ...tokenCookieOptions(), maxAge: undefined });
  res.json({ ok: true });
});

// اطلاعات کاربر جاری — endpoint «وضعیت احراز هویت» (نه منبع محافظت‌شده).
// برای کاربر مهمان به‌جای 401، پاسخ 200 با user:null می‌دهد تا در کنسول
// مرورگر خطای شبکه ثبت نشود (بهبود امتیاز Best Practices در Lighthouse و
// تمیز ماندن کنسول). رفتار کلاینت تغییری نمی‌کند: نبودِ user = خروج.
router.get('/me', async (req, res) => {
  try {
    const token = getTokenFromReq(req);
    if (!token) return res.json({ user: null });
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(payload.id);
    if (!user || user.isBlocked) return res.json({ user: null });
    const { _id, phone, name, city, favorites, role } = user;
    res.json({ user: { id: _id, phone, name, city, favorites, role } });
  } catch {
    res.json({ user: null });
  }
});

export default router;
