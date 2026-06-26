import { Router } from 'express';
import Category from '../models/Category.js';
import { fieldsForChain, slugChainFor } from '../config/category-fields.js';

const router = Router();

// خروجی: لیست تخت (flat) + درخت چندسطحی (tree)
router.get('/', async (_req, res, next) => {
  try {
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

    res.json({ categories: cats, tree: build('root') });
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
