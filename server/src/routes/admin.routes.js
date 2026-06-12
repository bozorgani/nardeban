import { Router } from 'express';
import mongoose from 'mongoose';
import Ad from '../models/Ad.js';
import User from '../models/User.js';
import Review from '../models/Review.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import Report from '../models/Report.js';
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
      totalAds, activeAds, soldAds, pendingAds,
      totalUsers, blockedUsers, totalReviews, totalConvs, totalMsgs,
      adsByDay, usersByDay, topCities,
    ] = await Promise.all([
      Ad.countDocuments(),
      Ad.countDocuments({ status: 'active' }),
      Ad.countDocuments({ status: 'sold' }),
      Ad.countDocuments({ status: 'pending' }),
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
        totalAds, activeAds, soldAds, pendingAds,
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
    if (!['pending', 'active', 'reserved', 'sold', 'hidden', 'rejected'].includes(status))
      return res.status(400).json({ message: 'وضعیت نامعتبر' });
    const update = { status };
    if (status === 'active') update.rejectReason = ''; // تایید → پاک شدن دلیل رد
    const ad = await Ad.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!ad) return res.status(404).json({ message: 'آگهی یافت نشد' });
    res.json({ ad });
  } catch (err) {
    next(err);
  }
});

// ✅ تایید آگهی در انتظار
router.post('/ads/:id/approve', async (req, res, next) => {
  try {
    const ad = await Ad.findByIdAndUpdate(
      req.params.id,
      { status: 'active', rejectReason: '' },
      { new: true }
    );
    if (!ad) return res.status(404).json({ message: 'آگهی یافت نشد' });
    res.json({ ok: true, ad });
  } catch (err) {
    next(err);
  }
});

// ❌ رد آگهی با دلیل (برای کاربر نمایش داده می‌شود)
router.post('/ads/:id/reject', async (req, res, next) => {
  try {
    const reason = (req.body.reason || '').trim().slice(0, 500);
    if (!reason) return res.status(400).json({ message: 'دلیل رد الزامی است' });
    const ad = await Ad.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected', rejectReason: reason },
      { new: true }
    );
    if (!ad) return res.status(404).json({ message: 'آگهی یافت نشد' });
    res.json({ ok: true, ad });
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

/* ------------------------------------------------------------------ */
/*  مدیریت گزارش‌های تخلف                                              */
/* ------------------------------------------------------------------ */

// لیست گزارش‌ها — گروه‌بندی per آگهی (تعداد گزارش + دلایل)
router.get('/reports', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const status = req.query.status || 'open';

    const match = status === 'all' ? {} : { status };

    const grouped = await Report.aggregate([
      { $match: match },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$ad',
          count: { $sum: 1 },
          reasons: { $addToSet: '$reason' },
          lastAt: { $max: '$createdAt' },
          reportIds: { $push: '$_id' },
        },
      },
      { $sort: { count: -1, lastAt: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
    ]);

    const total = (await Report.distinct('ad', match)).length;

    // اطلاعات آگهی‌ها + جزئیات گزارش‌ها
    const adIds = grouped.map((g) => g._id);
    const [ads, details] = await Promise.all([
      Ad.find({ _id: { $in: adIds } })
        .select('title price isFree status city images owner')
        .populate('owner', 'name phone isBlocked')
        .lean(),
      Report.find({ ad: { $in: adIds }, ...match })
        .sort({ createdAt: -1 })
        .populate('reporter', 'name phone')
        .lean(),
    ]);
    const adMap = Object.fromEntries(ads.map((a) => [String(a._id), a]));
    const detailMap = {};
    for (const d of details) {
      const k = String(d.ad);
      if (!detailMap[k]) detailMap[k] = [];
      detailMap[k].push({
        _id: d._id,
        reason: d.reason,
        details: d.details,
        createdAt: d.createdAt,
        reporterName: d.reporter?.name || 'ناشناس',
        reporterPhone: d.reporter?.phone || '',
      });
    }

    res.json({
      groups: grouped.map((g) => ({
        ad: adMap[String(g._id)] || null,
        adId: String(g._id),
        count: g.count,
        reasons: g.reasons,
        lastAt: g.lastAt,
        reports: detailMap[String(g._id)] || [],
      })),
      total,
      pages: Math.ceil(total / limit),
      page,
    });
  } catch (err) {
    next(err);
  }
});

// تعداد گزارش‌های باز (برای باج تب)
router.get('/reports/open-count', async (_req, res, next) => {
  try {
    const ads = await Report.distinct('ad', { status: 'open' });
    res.json({ total: ads.length });
  } catch (err) {
    next(err);
  }
});

// رسیدگی به همه گزارش‌های یک آگهی
//  action: 'dismiss' (بی‌اساس) | 'hide' (مخفی کردن آگهی) | 'reject' (رد با دلیل) | 'delete' (حذف کامل)
router.post('/reports/ad/:adId/resolve', async (req, res, next) => {
  try {
    const { action, reason } = req.body;
    const adId = req.params.adId;
    if (!['dismiss', 'hide', 'reject', 'delete'].includes(action))
      return res.status(400).json({ message: 'اقدام نامعتبر' });

    const ad = await Ad.findById(adId);
    if (!ad && action !== 'dismiss')
      return res.status(404).json({ message: 'آگهی یافت نشد' });

    if (action === 'hide') {
      ad.status = 'hidden';
      await ad.save();
    } else if (action === 'reject') {
      const r = (reason || '').trim().slice(0, 500);
      if (!r) return res.status(400).json({ message: 'دلیل رد الزامی است' });
      ad.status = 'rejected';
      ad.rejectReason = r;
      await ad.save();
    } else if (action === 'delete') {
      await Ad.findByIdAndDelete(adId);
      const convs = await Conversation.find({ ad: adId }).select('_id');
      await Promise.all([
        Message.deleteMany({ conversation: { $in: convs.map((c) => c._id) } }),
        Conversation.deleteMany({ ad: adId }),
      ]);
    }

    const newStatus = action === 'dismiss' ? 'dismissed' : 'resolved';
    await Report.updateMany(
      { ad: adId, status: 'open' },
      { status: newStatus, resolvedBy: req.user._id, resolvedAt: new Date() }
    );

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
