import { Router } from 'express';
import mongoose from 'mongoose';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import User from '../models/User.js';
import Ad from '../models/Ad.js';
import Review from '../models/Review.js';

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

/* ------------------------------------------------------------------ */
/*  پروفایل عمومی فروشنده                                              */
/* ------------------------------------------------------------------ */

// GET /api/users/:id/profile — اطلاعات عمومی + آگهی‌های فعال + خلاصه امتیازها
router.get('/:id/profile', optionalAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id))
      return res.status(400).json({ message: 'شناسه نامعتبر' });

    const seller = await User.findById(id).select('name city createdAt').lean();
    if (!seller) return res.status(404).json({ message: 'کاربر یافت نشد' });

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(40, parseInt(req.query.limit) || 24);

    const [ads, totalAds, soldCount, ratingAgg, myReview] = await Promise.all([
      Ad.find({ owner: id, status: 'active' })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('title price isFree city neighborhood images condition createdAt category')
        .populate('category', 'name slug icon')
        .lean(),
      Ad.countDocuments({ owner: id, status: 'active' }),
      Ad.countDocuments({ owner: id, status: 'sold' }),
      Review.aggregate([
        { $match: { seller: new mongoose.Types.ObjectId(id) } },
        {
          $group: {
            _id: null,
            avg: { $avg: '$rating' },
            count: { $sum: 1 },
            // توزیع ستاره‌ها برای نمودار
            s1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
            s2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
            s3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
            s4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
            s5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
          },
        },
      ]),
      req.user ? Review.findOne({ seller: id, rater: req.user._id }).lean() : null,
    ]);

    // فقط عکس اول برای کارت
    for (const ad of ads) {
      if (ad.images?.length > 1) ad.images = [ad.images[0]];
    }

    const agg = ratingAgg[0] || null;

    res.json({
      seller: {
        id: seller._id,
        name: seller.name || 'کاربر نردبان',
        city: seller.city,
        memberSince: seller.createdAt,
      },
      ads,
      totalAds,
      pages: Math.ceil(totalAds / limit),
      page,
      soldCount,
      rating: agg
        ? {
            avg: Math.round(agg.avg * 10) / 10,
            count: agg.count,
            distribution: { 1: agg.s1, 2: agg.s2, 3: agg.s3, 4: agg.s4, 5: agg.s5 },
          }
        : { avg: 0, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
      myReview: myReview ? { rating: myReview.rating, comment: myReview.comment } : null,
      isOwner: req.user ? String(req.user._id) === String(id) : false,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/users/:id/reviews — لیست نظرات (صفحه‌بندی)
router.get('/:id/reviews', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id))
      return res.status(400).json({ message: 'شناسه نامعتبر' });

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(30, parseInt(req.query.limit) || 10);

    const [reviews, total] = await Promise.all([
      Review.find({ seller: id })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('rater', 'name')
        .lean(),
      Review.countDocuments({ seller: id }),
    ]);

    res.json({
      reviews: reviews.map((r) => ({
        _id: r._id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
        raterName: r.rater?.name || 'کاربر نردبان',
      })),
      total,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/users/:id/reviews — ثبت/ویرایش امتیاز (فقط با ورود)
router.post('/:id/reviews', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id))
      return res.status(400).json({ message: 'شناسه نامعتبر' });
    if (String(req.user._id) === String(id))
      return res.status(400).json({ message: 'نمی‌توانید به خودتان امتیاز دهید' });

    const seller = await User.findById(id);
    if (!seller) return res.status(404).json({ message: 'کاربر یافت نشد' });

    const rating = parseInt(req.body.rating);
    if (!rating || rating < 1 || rating > 5)
      return res.status(400).json({ message: 'امتیاز باید بین ۱ تا ۵ باشد' });

    const comment = (req.body.comment || '').trim().slice(0, 500);

    const review = await Review.findOneAndUpdate(
      { seller: id, rater: req.user._id },
      { seller: id, rater: req.user._id, rating, comment },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ ok: true, review: { rating: review.rating, comment: review.comment } });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/users/:id/reviews — حذف امتیاز خودم
router.delete('/:id/reviews', requireAuth, async (req, res, next) => {
  try {
    await Review.deleteOne({ seller: req.params.id, rater: req.user._id });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
