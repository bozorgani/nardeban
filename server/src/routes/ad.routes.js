import { Router } from 'express';
import mongoose from 'mongoose';
import Ad from '../models/Ad.js';
import Category from '../models/Category.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { deleteUploads } from '../utils/files.js';
import { optimizeImages } from '../middleware/optimizeImages.js';
import { writeLimiter } from '../middleware/limiters.js';
import { deleteAdCascade } from '../services/adDeletion.js';

const router = Router();

// نرمال‌سازی متن فارسی (ی/ک عربی، نیم‌فاصله) برای جستجوی قابل اعتماد
const normalizeFa = (s) =>
  String(s).replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/\u200c/g, ' ').trim();
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// الگویی که فاصله و نیم‌فاصله را یکسان می‌بیند
const flexible = (w) => escapeRegex(w).replace(/ /g, '[\\s\\u200c]+');

// پارس امن attrs از فرم (JSON string) — فقط مقادیر رشته‌ای کوتاه
function parseAttrs(raw) {
  try {
    const obj = typeof raw === 'string' ? JSON.parse(raw) : raw || {};
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      if (/^[a-zA-Z][a-zA-Z0-9_]{0,30}$/.test(k) && v !== '' && v != null) {
        out[k] = String(v).slice(0, 100);
      }
    }
    return out;
  } catch {
    return {};
  }
}

// لیست آگهی‌ها + جستجو و فیلتر + صفحه‌بندی
// GET /api/ads?q=&category=slug&city=&minPrice=&maxPrice=&page=&limit=&sort=
router.get('/', async (req, res, next) => {
  try {
    const { q, category, city, minPrice, maxPrice, sort = 'newest' } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(40, parseInt(req.query.limit) || 24);

    const filter = { status: 'active' };

    if (q && q.trim()) {
      // جستجوی regex: زیررشته‌ها و کلمات ناقص فارسی را هم پیدا می‌کند
      const words = normalizeFa(q).split(/\s+/).filter(Boolean).slice(0, 6);
      if (words.length) {
        filter.$and = words.map((w) => ({
          $or: [
            { title: { $regex: flexible(w), $options: 'i' } },
            { description: { $regex: flexible(w), $options: 'i' } },
          ],
        }));
      }
    }
    if (city) {
      // پشتیبانی چند شهر: city=تهران,کاشان,اصفهان
      const cities = String(city).split(',').map((c) => normalizeFa(c)).filter(Boolean);
      if (cities.length === 1) filter.city = cities[0];
      else if (cities.length > 1) filter.city = { $in: cities };
    }
    if (category) {
      const cat = await Category.findOne({ slug: category });
      if (cat) {
        // جمع‌آوری همه نوادگان (هر عمقی) — برای دسته‌بندی ۳ سطحی
        const ids = [cat._id];
        let frontier = [cat._id];
        while (frontier.length) {
          const children = await Category.find({ parent: { $in: frontier } }).select('_id');
          frontier = children.map((c) => c._id);
          ids.push(...frontier);
        }
        filter.category = { $in: ids };
      }
    }
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    // فیلترهای اختصاصی دسته: attr_brand=پراید | attr_year_min=1395 | attr_mileage_max=100000
    for (const [qk, qv] of Object.entries(req.query)) {
      if (!qk.startsWith('attr_') || !qv) continue;
      const m = qk.match(/^attr_(.+?)(_min|_max)?$/);
      if (!m) continue;
      const [, key, bound] = m;
      const field = `attrs.${key}`;
      if (bound) {
        // مقایسه عددی روی رشته‌ها با $expr — آگهی بدون این attr (null) نباید پاس شود
        const conv = { $convert: { input: '$' + field, to: 'double', onError: null, onNull: null } };
        filter.$expr = filter.$expr || { $and: [] };
        filter.$expr.$and.push({
          $and: [
            { $ne: [conv, null] },
            { [bound === '_min' ? '$gte' : '$lte']: [conv, Number(qv)] },
          ],
        });
      } else {
        filter[field] = String(qv);
      }
    }

    const sortMap = {
      newest: { createdAt: -1 },
      cheapest: { price: 1 },
      expensive: { price: -1 },
    };

    const [ads, total] = await Promise.all([
      Ad.find(filter)
        .sort(sortMap[sort] || sortMap.newest)
        .skip((page - 1) * limit)
        .limit(limit)
        // فقط فیلدهای لازم برای کارت — payload سبک‌تر در لیست‌های بزرگ
        .select('title price isFree city neighborhood images condition createdAt category attrs')
        .populate('category', 'name slug icon')
        .lean(),
      Ad.countDocuments(filter),
    ]);

    // فقط عکس اول برای کارت لازم است (کاهش حجم پاسخ)
    for (const ad of ads) {
      if (ad.images?.length > 1) ad.images = [ad.images[0]];
    }

    res.json({ ads, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

// آگهی‌های من
router.get('/mine', requireAuth, async (req, res, next) => {
  try {
    const ads = await Ad.find({ owner: req.user._id })
      .sort({ createdAt: -1 })
      .populate('category', 'name slug icon')
      .lean();
    res.json({ ads });
  } catch (err) {
    next(err);
  }
});

// آگهی‌های مشابه: همان دسته (اولویت: همان شهر) — برای پایین صفحه آگهی
router.get('/:id/similar', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ message: 'شناسه نامعتبر' });

    const ad = await Ad.findById(req.params.id).select('category city').lean();
    if (!ad) return res.status(404).json({ message: 'آگهی یافت نشد' });

    const base = {
      _id: { $ne: ad._id },
      status: 'active',
      category: ad.category,
    };
    const sel = 'title price isFree city neighborhood images condition createdAt category';

    // اول همان شهر، سپس بقیه شهرها تا سقف ۶
    const sameCity = await Ad.find({ ...base, city: ad.city })
      .sort({ createdAt: -1 })
      .limit(6)
      .select(sel)
      .populate('category', 'name slug icon')
      .lean();

    let others = [];
    if (sameCity.length < 6) {
      others = await Ad.find({ ...base, city: { $ne: ad.city } })
        .sort({ createdAt: -1 })
        .limit(6 - sameCity.length)
        .select(sel)
        .populate('category', 'name slug icon')
        .lean();
    }

    let ads = [...sameCity, ...others];

    // اگر زیردسته کم‌آگهی بود → fallback به کل شاخه دسته ریشه (سطح ۱)
    if (ads.length < 3) {
      // بالا رفتن تا ریشه
      let root = await Category.findById(ad.category).lean();
      let guard = 0;
      while (root?.parent && guard++ < 10) {
        root = await Category.findById(root.parent).lean();
      }
      if (root) {
        // همه نوادگان ریشه (BFS)
        const ids = [root._id];
        let frontier = [root._id];
        while (frontier.length) {
          const children = await Category.find({ parent: { $in: frontier } }).select('_id');
          frontier = children.map((c) => c._id);
          ids.push(...frontier);
        }
        const excluded = new Set(ads.map((a) => String(a._id)));
        const more = await Ad.find({
          _id: { $ne: ad._id },
          status: 'active',
          category: { $in: ids },
        })
          .sort({ createdAt: -1 })
          .limit(8)
          .select(sel)
          .populate('category', 'name slug icon')
          .lean();
        ads = [...ads, ...more.filter((a) => !excluded.has(String(a._id)))].slice(0, 6);
      }
    }
    for (const a of ads) if (a.images?.length > 1) a.images = [a.images[0]];

    res.json({ ads });
  } catch (err) {
    next(err);
  }
});

// جزئیات آگهی
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ message: 'شناسه نامعتبر' });

    const ad = await Ad.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    )
      .populate('category', 'name slug icon')
      .populate('owner', 'name city')
      .lean();

    if (!ad) return res.status(404).json({ message: 'آگهی یافت نشد' });

    // آگهی در انتظار/ردشده فقط برای مالک و ادمین قابل مشاهده است
    if (['pending', 'rejected'].includes(ad.status)) {
      const isOwner = req.user && String(req.user._id) === String(ad.owner?._id || ad.owner);
      const isAdmin = req.user?.role === 'admin';
      if (!isOwner && !isAdmin)
        return res.status(404).json({ message: 'آگهی یافت نشد' });
    }

    res.json({ ad });
  } catch (err) {
    next(err);
  }
});

// ثبت آگهی (با حداکثر ۵ عکس)
router.post('/', writeLimiter, requireAuth, upload.array('images', 5), optimizeImages, async (req, res, next) => {
  try {
    const {
      title, description, price, isFree, category, city, neighborhood, contactPhone,
      lat, lng, condition, itemType, model, features, chatEnabled, callEnabled,
    } = req.body;

    if (!title || !description || !category || !city)
      return res.status(400).json({ message: 'عنوان، توضیحات، دسته‌بندی و شهر الزامی است' });

    const images = (req.files || []).map((f) => `/uploads/${f.filename}`);

    const ad = await Ad.create({
      title,
      description,
      price: isFree === 'true' ? 0 : Number(price) || 0,
      isFree: isFree === 'true',
      category,
      city,
      neighborhood: neighborhood || '',
      location: {
        lat: lat ? Number(lat) : null,
        lng: lng ? Number(lng) : null,
      },
      condition: condition || '',
      itemType: itemType || '',
      model: model || '',
      features: features || '',
      images,
      owner: req.user._id,
      contactPhone: contactPhone || req.user.phone,
      chatEnabled: chatEnabled !== 'false',
      callEnabled: callEnabled !== 'false',
      attrs: parseAttrs(req.body.attrs),
    });

    res.status(201).json({ ad });
  } catch (err) {
    next(err);
  }
});

// ویرایش کامل آگهی — فقط مالک (همه فیلدها + مدیریت عکس‌ها)
router.patch('/:id', requireAuth, upload.array('images', 5), optimizeImages, async (req, res, next) => {
  try {
    const ad = await Ad.findById(req.params.id);
    if (!ad) return res.status(404).json({ message: 'آگهی یافت نشد' });
    if (!ad.owner.equals(req.user._id))
      return res.status(403).json({ message: 'دسترسی ندارید' });

    // فیلدهای متنی ساده
    const allowed = [
      'title', 'description', 'city', 'neighborhood',
      'condition', 'itemType', 'model', 'features', 'contactPhone',
    ];
    const wasUnderReview = ['pending', 'rejected'].includes(ad.status);
    let contentChanged = allowed.some(
      (k) => req.body[k] !== undefined && String(req.body[k]) !== String(ad[k] ?? '')
    );
    // تغییر قیمت/دسته هم محتوایی محسوب می‌شود
    if (req.body.price !== undefined && Number(req.body.price) !== ad.price) contentChanged = true;
    if (req.body.category && String(req.body.category) !== String(ad.category)) contentChanged = true;

    for (const key of allowed) if (req.body[key] !== undefined) ad[key] = req.body[key];

    // مالک فقط بین وضعیت‌های عادی جابجا می‌شود؛ تایید (active) فقط با ادمین
    if (req.body.status !== undefined) {
      const userAllowed = ['reserved', 'sold', 'hidden', 'active'];
      if (userAllowed.includes(req.body.status) && !wasUnderReview) {
        ad.status = req.body.status;
      }
    }

    // قیمت / رایگان
    if (req.body.isFree !== undefined) ad.isFree = String(req.body.isFree) === 'true';
    if (req.body.price !== undefined)
      ad.price = ad.isFree ? 0 : Number(req.body.price) || 0;

    // دسته‌بندی و راه‌های تماس
    if (req.body.category && mongoose.isValidObjectId(req.body.category))
      ad.category = req.body.category;
    if (req.body.chatEnabled !== undefined)
      ad.chatEnabled = String(req.body.chatEnabled) !== 'false';
    if (req.body.callEnabled !== undefined)
      ad.callEnabled = String(req.body.callEnabled) !== 'false';

    // فیلدهای اختصاصی دسته
    if (req.body.attrs !== undefined) {
      const parsed = parseAttrs(req.body.attrs);
      if (JSON.stringify(Object.fromEntries(ad.attrs || new Map())) !== JSON.stringify(parsed)) contentChanged = true;
      ad.attrs = parsed;
    }

    // موقعیت
    if (req.body.lat !== undefined && req.body.lng !== undefined) {
      ad.location = {
        lat: req.body.lat ? Number(req.body.lat) : null,
        lng: req.body.lng ? Number(req.body.lng) : null,
      };
    }

    // مدیریت عکس‌ها:
    //  keepImages = JSON آرایه‌ای از مسیرهای قبلی که باید بمانند (به همان ترتیب — اولی = اصلی)
    //  فایل‌های جدید آپلودی به انتها اضافه می‌شوند (سقف ۵)
    const added = (req.files || []).map((f) => `/uploads/${f.filename}`);
    const imagesBefore = JSON.stringify(ad.images);
    const oldImages = [...ad.images];
    if (req.body.keepImages !== undefined) {
      let keep = [];
      try { keep = JSON.parse(req.body.keepImages); } catch { keep = []; }
      keep = Array.isArray(keep) ? keep.filter((p) => ad.images.includes(p)) : [];
      ad.images = [...keep, ...added].slice(0, 5);
    } else if (added.length) {
      ad.images = [...ad.images, ...added].slice(0, 5);
    }
    // عکس‌های قدیمی که دیگر استفاده نمی‌شوند → حذف از دیسک
    const removed = oldImages.filter((p) => !ad.images.includes(p));
    if (removed.length) deleteUploads(removed);
    if (JSON.stringify(ad.images) !== imagesBefore) contentChanged = true;

    // هر ویرایش محتوایی (چه pending/rejected چه active) → بازگشت به صف بررسی مدیر
    if (contentChanged) {
      ad.status = 'pending';
      ad.rejectReason = '';
    }

    await ad.save();
    res.json({ ad });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const ad = await Ad.findById(req.params.id).select('owner');
    if (!ad) return res.status(404).json({ message: 'آگهی یافت نشد' });
    if (!ad.owner.equals(req.user._id))
      return res.status(403).json({ message: 'دسترسی ندارید' });
    // حذف آبشاری امن: آگهی + گفتگوها + پیام‌ها + گزارش‌ها + فایل‌ها (BE-01)
    await deleteAdCascade(ad._id);
    res.json({ message: 'آگهی حذف شد' });
  } catch (err) {
    next(err);
  }
});

export default router;
