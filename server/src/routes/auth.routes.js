import { Router } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';
import { sendOtp } from '../services/sms.js';
import { JWT_SECRET } from '../config/env.js';

const router = Router();

const isProd = process.env.NODE_ENV === 'production';

const sign = (user) =>
  jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '30d' });

// مرحله ۱: درخواست کد تایید
router.post('/request-otp', async (req, res, next) => {
  try {
    const { phone } = req.body;
    if (!/^09\d{9}$/.test(phone || ''))
      return res.status(400).json({ message: 'شماره موبایل معتبر نیست (مثال: 09123456789)' });

    const code = String(Math.floor(10000 + Math.random() * 90000)); // 5 رقمی
    const expires = new Date(Date.now() + 5 * 60 * 1000);

    await User.findOneAndUpdate(
      { phone },
      { phone, otpCode: code, otpExpires: expires },
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
    const user = await User.findOne({ phone }).select('+otpCode +otpExpires');
    if (!user || !user.otpCode) return res.status(400).json({ message: 'ابتدا درخواست کد دهید' });
    if (user.otpExpires < new Date()) return res.status(400).json({ message: 'کد منقضی شده است' });
    if (user.otpCode !== String(code)) return res.status(400).json({ message: 'کد اشتباه است' });

    user.otpCode = undefined;
    user.otpExpires = undefined;
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
