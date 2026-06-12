import { Router } from 'express';
import Category from '../models/Category.js';

const router = Router();

// خروجی: هم لیست تخت (flat) و هم درخت (tree) با زیردسته‌ها
router.get('/', async (_req, res, next) => {
  try {
    const cats = await Category.find().sort({ _id: 1 }).lean();
    const parents = cats.filter((c) => !c.parent);
    const tree = parents.map((p) => ({
      ...p,
      children: cats.filter((c) => c.parent && String(c.parent) === String(p._id)),
    }));
    res.json({ categories: cats, tree });
  } catch (err) {
    next(err);
  }
});

export default router;
