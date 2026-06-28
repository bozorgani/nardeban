import { Router } from 'express';
import PushSubscription from '../models/PushSubscription.js';
import { requireAuth } from '../middleware/auth.js';
import { VAPID_PUBLIC_KEY, isPushConfigured } from '../push.js';

const router = Router();

/**
 * 🔒 اعتبارسنجی endpoint اشتراک push برای جلوگیری از SSRF.
 * بدون allowlist، مهاجم می‌توانست endpoint داخلی (مثل http://169.254.169.254/...
 * متادیتای کلود، یا http://localhost) ثبت کند تا سرور هنگام ارسال push به سرویس‌های
 * داخلی درخواست بزند. فقط دامنه‌های رسمیِ push serviceهای مرورگرها مجازند.
 */
const ALLOWED_PUSH_HOST = /(^|\.)(googleapis\.com|mozilla\.com|push\.services\.mozilla\.com|windows\.com|microsoft\.com|apple\.com)$/i;

function isValidPushEndpoint(endpoint) {
  let u;
  try {
    u = new URL(endpoint);
  } catch {
    return false;
  }
  if (u.protocol !== 'https:') return false; // فقط HTTPS
  const host = u.hostname.toLowerCase();
  // رد صریح آدرس‌های داخلی/لوکال (لایهٔ دوم در کنار allowlist)
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '169.254.169.254' || // metadata endpoint کلود
    host.endsWith('.local') ||
    /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host) ||
    /^\d+\.\d+\.\d+\.\d+$/.test(host) // هر IP خام رد می‌شود (push serviceها دامنه دارند)
  ) {
    return false;
  }
  return ALLOWED_PUSH_HOST.test(host);
}

// کلید عمومی VAPID (برای subscribe در مرورگر)
// اگر Web Push پیکربندی نشده باشد، key خالی و enabled=false برمی‌گردد
// تا کلاینت تلاش به subscribe نکند.
router.get('/vapid-public-key', (_req, res) => {
  res.json({ key: VAPID_PUBLIC_KEY, enabled: isPushConfigured() });
});

// ثبت اشتراک push برای کاربر جاری
router.post('/subscribe', requireAuth, async (req, res, next) => {
  try {
    const { endpoint, keys } = req.body || {};
    if (!endpoint || !keys?.p256dh || !keys?.auth)
      return res.status(400).json({ message: 'اشتراک نامعتبر است' });

    // 🔒 ضد SSRF: فقط endpointهای رسمی push service مجازند
    if (typeof endpoint !== 'string' || !isValidPushEndpoint(endpoint))
      return res.status(400).json({ message: 'آدرس اشتراک نامعتبر است' });

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
