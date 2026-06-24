import webpush from 'web-push';
import PushSubscription from './models/PushSubscription.js';

/**
 * سرویس Web Push (نوتیفیکیشن چت) — SEC-03
 * ----------------------------------------------------------------------------
 * کلیدهای VAPID فقط از متغیرهای محیطی خوانده می‌شوند. هیچ کلیدی در سورس هاردکد
 * نمی‌شود (کلید خصوصی نباید هرگز در مخزن باشد).
 *
 * ساخت کلیدها:  npx web-push generate-vapid-keys
 * متغیرها:
 *   VAPID_PUBLIC_KEY   کلید عمومی
 *   VAPID_PRIVATE_KEY  کلید خصوصی
 *   VAPID_SUBJECT      mailto:you@example.com  (پیش‌فرض: mailto:admin@nardeban.example)
 *
 * اگر کلیدها تنظیم نشده باشند، Web Push به‌صورت بی‌صدا غیرفعال می‌شود (بدون کرش)
 * و sendPushToUser کاری انجام نمی‌دهد.
 */
export const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY?.trim() || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY?.trim() || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT?.trim() || 'mailto:admin@nardeban.example';

let configured = false;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    configured = true;
    console.log('✅ Web Push پیکربندی شد');
  } catch (err) {
    console.warn('⚠️ کلیدهای VAPID نامعتبرند — Web Push غیرفعال شد:', err.message);
  }
} else {
  console.warn(
    '⚠️ VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY تنظیم نشده — Web Push غیرفعال است. ' +
      'برای فعال‌سازی:  npx web-push generate-vapid-keys'
  );
}

/** آیا Web Push فعال است؟ (برای endpoint و کلاینت) */
export const isPushConfigured = () => configured;

/**
 * ارسال نوتیف به همهٔ دستگاه‌های یک کاربر.
 * اشتراک‌های منقضی (410/404) خودکار حذف می‌شوند.
 */
export async function sendPushToUser(userId, payload) {
  if (!configured) return;
  const subs = await PushSubscription.find({ user: userId }).lean();
  if (!subs.length) return;

  const body = JSON.stringify(payload);
  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          body,
          { TTL: 60 * 60 }
        );
      } catch (err) {
        // اشتراک باطل‌شده را پاک کن
        if (err.statusCode === 404 || err.statusCode === 410) {
          await PushSubscription.deleteOne({ _id: sub._id });
        }
      }
    })
  );
}
