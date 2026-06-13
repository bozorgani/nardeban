import webpush from 'web-push';
import PushSubscription from './models/PushSubscription.js';

/**
 * سرویس Web Push (نوتیفیکیشن چت)
 * کلیدهای VAPID از env خوانده می‌شوند؛ مقادیر پیش‌فرض فقط برای دمو/توسعه است.
 * در پروداکشن حتماً کلید خودتان را بسازید:  npx web-push generate-vapid-keys
 */
export const VAPID_PUBLIC_KEY =
  process.env.VAPID_PUBLIC_KEY ||
  'BE5cYwzEQWHXkfa5L5ACqPkok6MLGZedhZggWU8qxFrx2TWWS0KYQDzJJ3E95WbRWJz9I6rgOcw0IoXKhfEtJUQ';

const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY || 'ryL_CTouZpqSj5TEOPUy_goaCjeTm9jhHsO4PH-8dq8';

let configured = false;
try {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@nardeban.example',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
  configured = true;
} catch (err) {
  console.warn('⚠️ web-push not configured:', err.message);
}

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
