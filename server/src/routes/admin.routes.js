import { Router } from 'express';
import mongoose from 'mongoose';
import Ad from '../models/Ad.js';
import User from '../models/User.js';
import Review from '../models/Review.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();
router.use(requireAdmin); // همهٔ مسیرها فقط ادمین

/* ------------------------------------------------------------------ */
/*  داشبورد: آمار کلی + نمودار ۱۴ روز اخیر                              */
/* ------------------------------------------------------------------ */
router.get('/stats', async (_req, res, next) => {
  try {
    const since = new Date(Date.now() - 14 * 24 * 3600 * 1000);
    since.setHours(0, 0, 0, 0);

    const [
      totalAds, activeAds, soldAds, hiddenAds,
      totalUsers, blockedUsers, totalReviews, totalConvs, totalMsgs,
      adsByDay, usersByDay, topCities,
    ] = await Promise.all([
      Ad.countDocuments(),
      Ad.countDocuments({ status: 'active' }),
      Ad.countDocuments({ status: 'sold' }),
      Ad.countDocuments({ status: 'hidden' }),
      User.countDocuments(),
      User.countDocuments({ isBlocked: true }),
      Review.countDocuments(),
      Conversation.countDocuments(),
      Message.countDocuments(),
      Ad.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      User.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Ad.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: '$city', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 6 },
      ]),
    ]);

    res.json({
      counts: {
        totalAds, activeAds, soldAds, hiddenAds,
        totalUsers, blockedUsers, totalReviews, totalConvs, totalMsgs,
      },
      adsByDay, usersByDay, topCities,
    });
  } catch (err) {
    next(err);
  }
});

/* ------------------------------------------------------------------ */
/*  مدیریت آگهی‌ها                                                     */
/* ------------------------------------------------------------------ */
router.get('/ads', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.q?.trim()) {
      const safe = req.query.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.title = { $regex: safe, $options: 'i' };
    }

    const [ads, total] = await Promise.all([
      Ad.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('title price isFree status city images views createdAt owner category')
        .populate('owner', 'name phone isBlocked')
        .populate('category', 'name icon')
        .lean(),
      Ad.countDocuments(filter),
    ]);

    res.json({ ads, total, pages: Math.ceil(total / limit), page });
  } catch (err) {
    next(err);
  }
});

// تغییر وضعیت هر آگهی (بدون نیاز به مالکیت)
router.patch('/ads/:id', async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['active', 'reserved', 'sold', 'hidden'].includes(status))
      return res.status(400).json({ message: 'وضعیت نامعتبر' });
    const ad = await Ad.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!ad) return res.status(404).json({ message: 'آگهی یافت نشد' });
    res.json({ ad });
  } catch (err) {
    next(err);
  }
});

// حذف هر آگهی + گفتگوها و پیام‌هایش
router.delete('/ads/:id', async (req, res, next) => {
  try {
    const ad = await Ad.findByIdAndDelete(req.params.id);
    if (!ad) return res.status(404).json({ message: 'آگهی یافت نشد' });
    const convs = await Conversation.find({ ad: ad._id }).select('_id');
    await Promise.all([
      Message.deleteMany({ conversation: { $in: convs.map((c) => c._id) } }),
      Conversation.deleteMany({ ad: ad._id }),
    ]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/* ------------------------------------------------------------------ */
/*  مدیریت کاربران                                                     */
/* ------------------------------------------------------------------ */
router.get('/users', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const filter = {};
    if (req.query.blocked === 'true') filter.isBlocked = true;
    if (req.query.q?.trim()) {
      const safe = req.query.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: { $regex: safe, $options: 'i' } },
        { phone: { $regex: safe } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('name phone city role isBlocked createdAt')
        .lean(),
      User.countDocuments(filter),
    ]);

    // تعداد آگهی هر کاربر
    const ids = users.map((u) => u._id);
    const adCounts = await Ad.aggregate([
      { $match: { owner: { $in: ids } } },
      { $group: { _id: '$owner', count: { $sum: 1 } } },
    ]);
    const countMap = Object.fromEntries(adCounts.map((a) => [String(a._id), a.count]));

    res.json({
      users: users.map((u) => ({ ...u, adCount: countMap[String(u._id)] || 0 })),
      total,
      pages: Math.ceil(total / limit),
      page,
    });
  } catch (err) {
    next(err);
  }
});

// مسدود / رفع مسدودی
router.patch('/users/:id/block', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'کاربر یافت نشد' });
    if (user.role === 'admin')
      return res.status(400).json({ message: 'مدیر را نمی‌توان مسدود کرد' });
    user.isBlocked = !user.isBlocked;
    await user.save();
    // مسدود → همه آگهی‌هایش مخفی
    if (user.isBlocked) await Ad.updateMany({ owner: user._id }, { status: 'hidden' });
    res.json({ ok: true, isBlocked: user.isBlocked });
  } catch (err) {
    next(err);
  }
});

/* ------------------------------------------------------------------ */
/*  مدیریت نظرات                                                       */
/* ------------------------------------------------------------------ */
router.get('/reviews', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const [reviews, total] = await Promise.all([
      Review.find()
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('seller', 'name phone')
        .populate('rater', 'name phone')
        .lean(),
      Review.countDocuments(),
    ]);
    res.json({ reviews, total, pages: Math.ceil(total / limit), page });
  } catch (err) {
    next(err);
  }
});

router.delete('/reviews/:id', async (req, res, next) => {
  try {
    await Review.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
