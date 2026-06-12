import { Router } from 'express';
import Category from '../models/Category.js';
import { CATEGORY_FIELDS, findRootSlug } from '../config/category-fields.js';

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

// فیلدهای اختصاصی یک دسته: ?slug=light-cars یا ?id=<categoryId>
router.get('/fields', async (req, res, next) => {
  try {
    let rootSlug = null;
    if (req.query.slug) {
      const cat = await Category.findOne({ slug: req.query.slug }).lean();
      if (cat) rootSlug = cat.parent ? await findRootSlug(Category, cat._id) : cat.slug;
    } else if (req.query.id) {
      rootSlug = await findRootSlug(Category, req.query.id);
    }
    res.json({ rootSlug, fields: CATEGORY_FIELDS[rootSlug] || [] });
  } catch (err) {
    next(err);
  }
});

export default router;
