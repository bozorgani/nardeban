import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// لیست نشان‌شده‌ها
router.get('/favorites', requireAuth, async (req, res, next) => {
  try {
    await req.user.populate({
      path: 'favorites',
      populate: { path: 'category', select: 'name slug icon' },
    });
    res.json({ favorites: req.user.favorites });
  } catch (err) {
    next(err);
  }
});

// نشان‌کردن / حذف نشان
router.post('/favorites/:adId', requireAuth, async (req, res, next) => {
  try {
    const { adId } = req.params;
    const idx = req.user.favorites.findIndex((f) => f.toString() === adId);
    if (idx === -1) req.user.favorites.push(adId);
    else req.user.favorites.splice(idx, 1);
    await req.user.save();
    res.json({ favorites: req.user.favorites, saved: idx === -1 });
  } catch (err) {
    next(err);
  }
});

// به‌روزرسانی پروفایل
router.patch('/me', requireAuth, async (req, res, next) => {
  try {
    const { name, city } = req.body;
    if (name !== undefined) req.user.name = name;
    if (city !== undefined) req.user.city = city;
    await req.user.save();
    res.json({ user: { id: req.user._id, phone: req.user.phone, name: req.user.name, city: req.user.city } });
  } catch (err) {
    next(err);
  }
});

export default router;
