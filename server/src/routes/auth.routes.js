import { Router } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const sign = (user) =>
  jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '30d' });

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

    // ⚠️ در محیط واقعی این کد با SMS ارسال می‌شود (کاوه‌نگار/قاصدک...).
    // در نسخه دمو برای تست برگردانده می‌شود:
    res.json({ message: 'کد تایید ارسال شد', demoCode: code });
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
