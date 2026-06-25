import { Router } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';
import { sendOtp } from '../services/sms.js';
import { JWT_SECRET } from '../config/env.js';
import { generateOtp, hashOtp, safeEqualHash } from '../utils/otp.js';

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
      // افزایش شمارندهٔ تلاش ناموفق و قفل در صورت عبور از سقف
      user.otpAttempts = (user.otpAttempts || 0) + 1;
      if (user.otpAttempts >= MAX_VERIFY_ATTEMPTS) {
        user.otpLockedUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
        user.otpHash = undefined; // باطل‌کردن کد فعلی — باید کد جدید بگیرد
        user.otpExpires = undefined;
        await user.save();
        return res.status(429).json({
          message: `تلاش‌های ناموفق زیاد — ${LOCK_MINUTES} دقیقه دیگر دوباره کد بگیرید`,
        });
      }
      await user.save();
      const left = MAX_VERIFY_ATTEMPTS - user.otpAttempts;
      return res
        .status(400)
        .json({ message: `کد اشتباه است (${left} تلاش باقی مانده)` });
    }

    // موفق — باطل‌کردن کد و ریست شمارنده‌ها
    user.otpHash = undefined;
    user.otpExpires = undefined;
    user.otpAttempts = 0;
    user.otpLockedUntil = null;
    await user.save();

    res.json({
      token: sign(user),
      user: { id: user._id, phone: user.phone, name: user.name, city: user.city, role: user.role },
    });
  } catch (err) {
    next(err);
  }
});

// اطلاعات کاربر جاری
router.get('/me', requireAuth, (req, res) => {
  const { _id, phone, name, city, favorites, role } = req.user;
  res.json({ user: { id: _id, phone, name, city, favorites, role } });
});

export default router;
