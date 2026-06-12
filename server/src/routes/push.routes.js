import { Router } from 'express';
import PushSubscription from '../models/PushSubscription.js';
import { requireAuth } from '../middleware/auth.js';
import { VAPID_PUBLIC_KEY } from '../push.js';

const router = Router();

// کلید عمومی VAPID (برای subscribe در مرورگر)
router.get('/vapid-public-key', (_req, res) => {
  res.json({ key: VAPID_PUBLIC_KEY });
});

// ثبت اشتراک push برای کاربر جاری
router.post('/subscribe', requireAuth, async (req, res, next) => {
  try {
    const { endpoint, keys } = req.body || {};
    if (!endpoint || !keys?.p256dh || !keys?.auth)
      return res.status(400).json({ message: 'اشتراک نامعتبر است' });

    await PushSubscription.findOneAndUpdate(
      { endpoint },
      {
        user: req.user._id,
        endpoint,
        keys,
        userAgent: req.headers['user-agent'] || '',
      },
      { upsert: true, new: true }
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// لغو اشتراک
router.post('/unsubscribe', requireAuth, async (req, res, next) => {
  try {
    const { endpoint } = req.body || {};
    if (endpoint) await PushSubscription.deleteOne({ endpoint, user: req.user._id });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
