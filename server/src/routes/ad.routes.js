import { Router } from 'express';
import mongoose from 'mongoose';
import Ad from '../models/Ad.js';
import Category from '../models/Category.js';
import { requireAuth } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();

// نرمال‌سازی متن فارسی (ی/ک عربی، نیم‌فاصله) برای جستجوی قابل اعتماد
const normalizeFa = (s) =>
  String(s).replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/\u200c/g, ' ').trim();
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// الگویی که فاصله و نیم‌فاصله را یکسان می‌بیند
const flexible = (w) => escapeRegex(w).replace(/ /g, '[\\s\\u200c]+');

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
        const children = await Category.find({ parent: cat._id }).select('_id');
        filter.category = { $in: [cat._id, ...children.map((c) => c._id)] };
      }
    }
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
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
        .select('title price isFree city neighborhood images condition createdAt category')
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

// جزئیات آگهی
router.get('/:id', async (req, res, next) => {
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
    res.json({ ad });
  } catch (err) {
    next(err);
  }
});

// ثبت آگهی (با حداکثر ۵ عکس)
router.post('/', requireAuth, upload.array('images', 5), async (req, res, next) => {
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
    });

    res.status(201).json({ ad });
  } catch (err) {
    next(err);
  }
});

// ویرایش وضعیت/حذف — فقط مالک
router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const ad = await Ad.findById(req.params.id);
    if (!ad) return res.status(404).json({ message: 'آگهی یافت نشد' });
    if (!ad.owner.equals(req.user._id))
      return res.status(403).json({ message: 'دسترسی ندارید' });

    const allowed = ['title', 'description', 'price', 'status', 'city', 'neighborhood'];
    for (const key of allowed) if (req.body[key] !== undefined) ad[key] = req.body[key];
    await ad.save();
    res.json({ ad });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const ad = await Ad.findById(req.params.id);
    if (!ad) return res.status(404).json({ message: 'آگهی یافت نشد' });
    if (!ad.owner.equals(req.user._id))
      return res.status(403).json({ message: 'دسترسی ندارید' });
    await ad.deleteOne();
    res.json({ message: 'آگهی حذف شد' });
  } catch (err) {
    next(err);
  }
});

export default router;
