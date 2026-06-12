import { Router } from 'express';
import Category from '../models/Category.js';

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

export default router;
