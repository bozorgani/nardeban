import { Router } from 'express';
import Category from '../models/Category.js';
import { fieldsForChain, slugChainFor } from '../config/category-fields.js';

const router = Router();

// کش in-memory برای پاسخ دسته‌ها (BE-06): دسته‌ها به‌ندرت تغییر می‌کنند،
// پس به‌جای ساخت درخت ۱۲۸ دسته‌ای در هر درخواست، نتیجه را ۵ دقیقه نگه می‌داریم.
let _catCache = { at: 0, payload: null };
const CAT_TTL = 5 * 60 * 1000; // ۵ دقیقه
export function invalidateCategoryCache() {
  _catCache = { at: 0, payload: null };
}

// خروجی: لیست تخت (flat) + درخت چندسطحی (tree)
router.get('/', async (_req, res, next) => {
  try {
    const now = Date.now();
    if (_catCache.payload && now - _catCache.at < CAT_TTL) {
      // کش معتبر — پاسخ فوری (TTFB پایین) + اجازهٔ کش به مرورگر/CDN
      res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
      return res.json(_catCache.payload);
    }

    const cats = await Category.find().sort({ _id: 1 }).lean();

    // ساخت درخت بازگشتی از لیست تخت
    const byParent = new Map();
    for (const c of cats) {
      const key = c.parent ? String(c.parent) : 'root';
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key).push(c);
    }
    const build = (parentKey) =>
      (byParent.get(parentKey) || []).map((c) => ({
        ...c,
        children: build(String(c._id)),
      }));

    const payload = { categories: cats, tree: build('root') };
    _catCache = { at: now, payload };
    res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    res.json(payload);
  } catch (err) {
    next(err);
  }
});

// فیلدهای اختصاصی یک دسته: ?slug=laptops یا ?id=<categoryId>
// فیلدها از کل زنجیرهٔ ریشه→دسته ترکیب (merge) می‌شوند (ارث‌بری per-subcategory).
router.get('/fields', async (req, res, next) => {
  try {
    const chain = await slugChainFor(Category, {
      id: req.query.id || null,
      slug: req.query.slug || null,
    });
    const fields = fieldsForChain(chain);
    // rootSlug برای سازگاری عقب‌رو + chain برای دیباگ/کلاینت
    res.json({ rootSlug: chain[0] || null, chain, fields });
  } catch (err) {
    next(err);
  }
});

export default router;
