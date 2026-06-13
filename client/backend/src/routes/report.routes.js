import { Router } from 'express';
import mongoose from 'mongoose';
import Report, { REPORT_REASONS } from '../models/Report.js';
import Ad from '../models/Ad.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// لیست دلایل (برای مودال)
router.get('/reasons', (_req, res) => {
  res.json({ reasons: REPORT_REASONS });
});

// ثبت گزارش تخلف — فقط با ورود
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { adId, reason, details } = req.body;
    if (!mongoose.isValidObjectId(adId))
      return res.status(400).json({ message: 'شناسه آگهی نامعتبر' });
    if (!REPORT_REASONS.includes(reason))
      return res.status(400).json({ message: 'دلیل گزارش نامعتبر است' });

    const ad = await Ad.findById(adId);
    if (!ad) return res.status(404).json({ message: 'آگهی یافت نشد' });
    if (ad.owner.equals(req.user._id))
      return res.status(400).json({ message: 'نمی‌توانید آگهی خودتان را گزارش کنید' });

    // یک گزارش per کاربر per آگهی — تکراری = به‌روزرسانی
    const report = await Report.findOneAndUpdate(
      { ad: adId, reporter: req.user._id },
      {
        ad: adId,
        reporter: req.user._id,
        reason,
        details: (details || '').trim().slice(0, 500),
        status: 'open',
        resolvedBy: null,
        resolvedAt: null,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json({ ok: true, reportId: report._id });
  } catch (err) {
    next(err);
  }
});

// آیا من قبلاً این آگهی را گزارش داده‌ام؟
router.get('/mine/:adId', requireAuth, async (req, res, next) => {
  try {
    const report = await Report.findOne({ ad: req.params.adId, reporter: req.user._id }).lean();
    res.json({ reported: !!report, reason: report?.reason || null });
  } catch (err) {
    next(err);
  }
});

export default router;
