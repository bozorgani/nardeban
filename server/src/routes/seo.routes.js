import { Router } from 'express';
import Ad from '../models/Ad.js';
import Category from '../models/Category.js';

const router = Router();

const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';

// لیست URL ها برای sitemap فرانت (فرانت خودش XML می‌سازد)
router.get('/sitemap-data', async (_req, res, next) => {
  try {
    const [ads, cats] = await Promise.all([
      Ad.find({ status: 'active' })
        .sort({ createdAt: -1 })
        .limit(5000)
        .select('_id updatedAt')
        .lean(),
      Category.find().select('slug').lean(),
    ]);
    res.json({
      siteUrl: SITE_URL,
      ads: ads.map((a) => ({ id: String(a._id), updatedAt: a.updatedAt })),
      categories: cats.map((c) => c.slug),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
