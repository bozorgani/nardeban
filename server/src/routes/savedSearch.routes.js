import { Router } from 'express';
import mongoose from 'mongoose';
import SavedSearch from '../models/SavedSearch.js';
import Ad from '../models/Ad.js';
import Category from '../models/Category.js';
import { requireAuth } from '../middleware/auth.js';
import { buildCategoryIndex } from '../utils/categories.js';

const router = Router();
router.use(requireAuth);

const MAX_SAVED = 10;

/* بخش غیر-دسته‌ایِ فیلتر (همیشه همگام) */
function baseFilter(s) {
  const filter = { status: 'active' };

  if (s.query?.trim()) {
    const safe = s.query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { title: { $regex: safe, $options: 'i' } },
      { description: { $regex: safe, $options: 'i' } },
    ];
  }
  if (s.city) {
    const cities = s.city.split(',').map((c) => c.trim()).filter(Boolean);
    if (cities.length === 1) filter.city = cities[0];
    else if (cities.length > 1) filter.city = { $in: cities };
  }
  if (s.minPrice != null || s.maxPrice != null) {
    filter.price = {};
    if (s.minPrice != null) filter.price.$gte = s.minPrice;
    if (s.maxPrice != null) filter.price.$lte = s.maxPrice;
  }
  const attrs = s.attrs instanceof Map ? Object.fromEntries(s.attrs) : s.attrs || {};
  for (const [k, v] of Object.entries(attrs)) {
    if (v) filter[`attrs.${k}`] = String(v);
  }
  return filter;
}

/**
 * ساخت فیلتر مونگو از یک جستجوی ذخیره‌شده (هم‌راستا با /api/ads).
 * @param {object} s  سند جستجوی ذخیره‌شده
 * @param {object} [catIndex]  ایندکس دسته‌بندیِ از پیش‌ساخته (BE-05). اگر داده شود،
 *   نوادگان دسته از حافظه resolve می‌شوند (بدون کوئری per جستجو → رفع N+1).
 *   اگر داده نشود، fallback به BFS دیتابیس (برای سازگاری با notifier).
 */
async function buildFilter(s, catIndex = null) {
  const filter = baseFilter(s);

  if (s.category) {
    let ids = null;
    if (catIndex) {
      ids = catIndex.descendantIdsBySlug(s.category); // از حافظه
    } else {
      const cat = await Category.findOne({ slug: s.category });
      if (cat) {
        ids = [cat._id];
        let frontier = [cat._id];
        while (frontier.length) {
          const children = await Category.find({ parent: { $in: frontier } }).select('_id');
          frontier = children.map((c) => c._id);
          ids.push(...frontier);
        }
      }
    }
    if (ids && ids.length) filter.category = { $in: ids };
  }

  return filter;
}

// لیست جستجوهای من + تعداد آگهی جدید هر کدام
router.get('/', async (req, res, next) => {
  try {
    const searches = await SavedSearch.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    // ایندکس دسته‌بندی یک‌بار ساخته می‌شود (رفع N+1 — BE-05)
    const catIndex = await buildCategoryIndex();

    const withCounts = await Promise.all(
      searches.map(async (s) => {
        const filter = await buildFilter(s, catIndex);
        filter.createdAt = { $gt: s.lastCheckedAt };
        const newCount = await Ad.countDocuments(filter);
        return { ...s, newCount };
      })
    );

    const totalNew = withCounts.reduce((sum, s) => sum + s.newCount, 0);
    res.json({ searches: withCounts, totalNew });
  } catch (err) {
    next(err);
  }
});

// فقط تعداد کل جدیدها (برای باج هدر)
router.get('/new-count', async (req, res, next) => {
  try {
    const searches = await SavedSearch.find({ user: req.user._id }).lean();
    if (!searches.length) return res.json({ total: 0 });

    // ایندکس یک‌بار + شمارش‌های موازی (رفع N+1 و حلقهٔ ترتیبی — BE-05)
    const catIndex = await buildCategoryIndex();
    const counts = await Promise.all(
      searches.map(async (s) => {
        const filter = await buildFilter(s, catIndex);
        filter.createdAt = { $gt: s.lastCheckedAt };
        return Ad.countDocuments(filter);
      })
    );
    const total = counts.reduce((sum, n) => sum + n, 0);
    res.json({ total });
  } catch (err) {
    next(err);
  }
});

// ذخیره جستجوی جدید
router.post('/', async (req, res, next) => {
  try {
    const count = await SavedSearch.countDocuments({ user: req.user._id });
    if (count >= MAX_SAVED)
      return res.status(400).json({ message: `حداکثر ${MAX_SAVED} جستجوی ذخیره‌شده مجاز است` });

    const { query = '', category = '', city = '', minPrice, maxPrice, attrs = {}, label } = req.body;
    if (!label?.trim()) return res.status(400).json({ message: 'برچسب جستجو الزامی است' });
    if (!query && !category && !city && minPrice == null && maxPrice == null && !Object.keys(attrs).length)
      return res.status(400).json({ message: 'جستجوی خالی قابل ذخیره نیست' });

    // جلوگیری از تکراری
    const dup = await SavedSearch.findOne({
      user: req.user._id, query, category, city,
      minPrice: minPrice ?? null, maxPrice: maxPrice ?? null,
    });
    if (dup) return res.status(400).json({ message: 'این جستجو قبلاً ذخیره شده است' });

    const saved = await SavedSearch.create({
      user: req.user._id,
      query: String(query).slice(0, 100),
      category: String(category).slice(0, 60),
      city: String(city).slice(0, 300),
      minPrice: minPrice != null ? Number(minPrice) : null,
      maxPrice: maxPrice != null ? Number(maxPrice) : null,
      attrs: Object.fromEntries(
        Object.entries(attrs)
          .filter(([k, v]) => /^[a-zA-Z][a-zA-Z0-9_]{0,30}$/.test(k) && v)
          .map(([k, v]) => [k, String(v).slice(0, 100)])
      ),
      label: String(label).trim().slice(0, 120),
    });
    res.status(201).json({ saved });
  } catch (err) {
    next(err);
  }
});

// «دیدم» — ریست شمارنده جدیدها برای یک جستجو
router.post('/:id/seen', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ message: 'شناسه نامعتبر' });
    await SavedSearch.updateOne(
      { _id: req.params.id, user: req.user._id },
      { lastCheckedAt: new Date() }
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// تغییر وضعیت اعلان
router.patch('/:id', async (req, res, next) => {
  try {
    const s = await SavedSearch.findOne({ _id: req.params.id, user: req.user._id });
    if (!s) return res.status(404).json({ message: 'یافت نشد' });
    if (req.body.notify !== undefined) s.notify = !!req.body.notify;
    if (req.body.label?.trim()) s.label = String(req.body.label).trim().slice(0, 120);
    await s.save();
    res.json({ saved: s });
  } catch (err) {
    next(err);
  }
});

// حذف
router.delete('/:id', async (req, res, next) => {
  try {
    await SavedSearch.deleteOne({ _id: req.params.id, user: req.user._id });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export { buildFilter };
export default router;
