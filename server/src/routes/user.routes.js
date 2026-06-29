import { Router } from 'express';
import mongoose from 'mongoose';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import User from '../models/User.js';
import Ad from '../models/Ad.js';
import Review from '../models/Review.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import { parseCursor } from '../utils/cursor.js';

const router = Router();

// لیست نشان‌شده‌ها
// لیست نشان‌شده‌ها — با pagination (M4)
//
// قبلاً کل آرایهٔ favorites با populate برمی‌گشت؛ کاربری با چند صد آگهی نشان‌شده
// → پاسخ سنگین، پر کردن اتفاقی حافظهٔ Node با populate آبشاری.
// حالا: paginate روی همان آرایه + populate فقط روی برشِ صفحهٔ جاری.
//
// نکته: ترتیب نمایش = ترتیب نشان‌شدن (انتهای آرایه = جدیدتر)، که در toggle
// favorites با $concatArrays حفظ شده. اینجا reverse می‌کنیم تا جدیدترها بالا
// بیایند (UX رایج‌تر برای «نشان‌شده‌های من»).
router.get('/favorites', requireAuth, async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(40, Math.max(1, parseInt(req.query.limit) || 24));

    // user.favorites یک آرایهٔ ObjectId است — بدون populate، صرفاً برای صفحه‌بندی
    const favIds = Array.isArray(req.user.favorites) ? req.user.favorites : [];
    const total = favIds.length;
    // جدیدترها بالا → آرایه را برعکس می‌کنیم
    const slice = favIds.slice().reverse().slice((page - 1) * limit, page * limit);

    // populate فقط روی برشِ صفحهٔ جاری، با حفظ ترتیبِ slice
    // (Ad از بالای فایل import شده)
    const docs = await Ad.find({ _id: { $in: slice } })
      .populate('category', 'name slug icon')
      .lean();
    const byId = new Map(docs.map((d) => [String(d._id), d]));
    const favorites = slice.map((id) => byId.get(String(id))).filter(Boolean);

    res.json({
      favorites,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
});

// نشان‌کردن / حذف نشان — toggle اتمیک (BE-03)
// به‌جای الگوی ناامن «خواندن آرایه → splice/push → save()» (که در toggleهای
// همزمان باعث lost-update و حتی تکراری‌شدن می‌شد)، از یک آپدیت تک‌مرحله‌ایِ
// pipeline استفاده می‌کنیم که روی همان سند اتمیک اجرا می‌شود.
router.post('/favorites/:adId', requireAuth, async (req, res, next) => {
  try {
    const { adId } = req.params;
    if (!mongoose.isValidObjectId(adId))
      return res.status(400).json({ message: 'شناسه آگهی نامعتبر' });

    const adObjId = new mongoose.Types.ObjectId(adId);

    const updated = await User.findByIdAndUpdate(
      req.user._id,
      [
        {
          $set: {
            favorites: {
              $cond: [
                { $in: [adObjId, { $ifNull: ['$favorites', []] }] },
                // اگر هست → حذف (با حفظ ترتیب بقیه)
                {
                  $filter: {
                    input: { $ifNull: ['$favorites', []] },
                    cond: { $ne: ['$$this', adObjId] },
                  },
                },
                // اگر نیست → افزودن به انتها
                { $concatArrays: [{ $ifNull: ['$favorites', []] }, [adObjId]] },
              ],
            },
          },
        },
      ],
      { new: true, projection: { favorites: 1 } }
    ).lean();

    if (!updated) return res.status(404).json({ message: 'کاربر یافت نشد' });

    const saved = updated.favorites.some((f) => String(f) === adId);
    res.json({ favorites: updated.favorites, saved });
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
        name: seller.name || 'کاربر بفروش',
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
    const cursor = parseCursor(req.query.cursor);
    const reviewFilter = { seller: id };
    const reviewListFilter = cursor
      ? {
          ...reviewFilter,
          $or: [
            { createdAt: { $lt: cursor.date } },
            { createdAt: cursor.date, _id: { $lt: cursor.id } },
          ],
        }
      : reviewFilter;

    const reviewQuery = Review.find(reviewListFilter)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit)
      .populate('rater', 'name')
      .lean();
    if (!cursor) reviewQuery.skip((page - 1) * limit);

    const [reviews, total] = await Promise.all([
      reviewQuery,
      Review.countDocuments(reviewFilter),
    ]);

    res.json({
      reviews: reviews.map((r) => ({
        _id: r._id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
        raterName: r.rater?.name || 'کاربر بفروش',
      })),
      total,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/users/:id/reviews — ثبت/ویرایش امتیاز (فقط با ورود)
//
// 🔒 ضد رأی‌بازی (M1): قبلاً هر کاربری می‌توانست به هر فروشنده‌ای امتیاز بدهد
// بدون اینکه واقعاً با او در ارتباط بوده باشد → ratingها قابل اعتماد نبودند.
// حالا شرط ثبت امتیاز این است که کاربر حداقل یک «گفتگوی واقعی» (یعنی یک
// Conversation با حداقل یک پیامِ رد و بدل‌شده) با فروشنده داشته باشد.
// این روش بدون نیاز به سیستم سفارش/ثبت معامله، عملاً جلوی رأی‌بازی کور را می‌گیرد.
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

    // 🔒 الزام تعامل قبلی: حداقل یک گفتگو با حداقل یک پیام بین این دو نفر
    // وجود داشته باشد (فرقی نمی‌کند کدام طرف خریدار/فروشنده بوده).
    // کوئری سبک است: ابتدا convId(های) مشترک را پیدا می‌کنیم (با ایندکس
    // یکتای {ad, buyer} و شرط seller، خیلی سریع)، سپس وجود حداقل یک پیام
    // را با exists چک می‌کنیم (بدون شمارش کامل).
    const convIds = await Conversation.find({
      $or: [
        { buyer: req.user._id, seller: id },
        { buyer: id, seller: req.user._id },
      ],
    })
      .select('_id')
      .lean();

    if (!convIds.length) {
      return res.status(403).json({
        message: 'برای ثبت امتیاز ابتدا باید با این کاربر گفتگو کرده باشید',
        code: 'NO_INTERACTION',
      });
    }

    const hasMessage = await Message.exists({
      conversation: { $in: convIds.map((c) => c._id) },
    });
    if (!hasMessage) {
      return res.status(403).json({
        message: 'برای ثبت امتیاز باید حداقل یک پیام رد و بدل کرده باشید',
        code: 'NO_INTERACTION',
      });
    }

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
