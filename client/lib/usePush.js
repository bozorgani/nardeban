'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from './api';

// base64url → Uint8Array (برای applicationServerKey)
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/**
 * گرفتن registration سرویس‌ورکر — اگر ثبت نشده بود، همین‌جا ثبت می‌کند.
 * ⚠️ عمداً از navigator.serviceWorker.ready استفاده نمی‌کنیم چون اگر SW
 * ثبت نشده باشد آن Promise برای همیشه معلق می‌ماند (باگ سوییچ نوتیفیکیشن).
 */
async function getSWRegistration() {
  let reg = await navigator.serviceWorker.getRegistration('/');
  if (!reg) {
    reg = await navigator.serviceWorker.register('/sw.js');
  }
  // صبر تا فعال شدن (حداکثر ۱۰ ثانیه)
  if (!reg.active) {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('سرویس‌ورکر فعال نشد — صفحه را رفرش کنید')), 10000);
      const sw = reg.installing || reg.waiting;
      if (!sw) { clearTimeout(timer); return resolve(); }
      sw.addEventListener('statechange', function fn() {
        if (sw.state === 'activated') {
          clearTimeout(timer);
          sw.removeEventListener('statechange', fn);
          resolve();
        }
      });
    });
  }
  return reg;
}

/**
 * مدیریت اشتراک Web Push
 * خروجی: { supported, permission, subscribed, loading, enable, disable }
 */
export function usePush(user) {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  // بررسی پشتیبانی و وضعیت فعلی (بدون register — فقط چک)
  useEffect(() => {
    (async () => {
      const ok =
        typeof window !== 'undefined' &&
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window;
      setSupported(ok);
      if (!ok || !user) return setLoading(false);

      setPermission(Notification.permission);
      try {
        const reg = await navigator.serviceWorker.getRegistration('/');
        const sub = reg ? await reg.pushManager.getSubscription() : null;
        setSubscribed(!!sub);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const enable = useCallback(async () => {
    if (!supported || !user) return { error: 'مرورگر شما پشتیبانی نمی‌کند' };
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted')
        return { error: 'اجازهٔ نوتیفیکیشن داده نشد — از تنظیمات مرورگر فعال کنید' };

      const reg = await getSWRegistration();
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        const { key, enabled } = await api('/push/vapid-public-key');
        if (enabled === false || !key) {
          return { error: 'سرویس نوتیفیکیشن روی سرور فعال نیست' };
        }
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(key),
        });
      }
      await api('/push/subscribe', { method: 'POST', body: sub.toJSON() });
      setSubscribed(true);
      return { ok: true };
    } catch (err) {
      return { error: err.message || 'خطا در فعال‌سازی نوتیفیکیشن' };
    } finally {
      setLoading(false);
    }
  }, [supported, user]);

  const disable = useCallback(async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration('/');
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub) {
        await api('/push/unsubscribe', {
          method: 'POST',
          body: { endpoint: sub.endpoint },
        }).catch(() => {});
        await sub.unsubscribe();
      }
      setSubscribed(false);
      return { ok: true };
    } catch (err) {
      return { error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  return { supported, permission, subscribed, loading, enable, disable };
}
