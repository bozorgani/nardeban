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
 * مدیریت اشتراک Web Push
 * خروجی: { supported, permission, subscribed, loading, enable, disable }
 */
export function usePush(user) {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  // بررسی پشتیبانی و وضعیت فعلی
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
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setSubscribed(!!sub);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const enable = useCallback(async () => {
    if (!supported || !user) return { error: 'پشتیبانی نمی‌شود' };
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') return { error: 'اجازهٔ نوتیفیکیشن داده نشد' };

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        const { key } = await api('/push/vapid-public-key');
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(key),
        });
      }
      await api('/push/subscribe', { method: 'POST', body: sub.toJSON() });
      setSubscribed(true);
      return { ok: true };
    } catch (err) {
      return { error: err.message || 'خطا در فعال‌سازی' };
    } finally {
      setLoading(false);
    }
  }, [supported, user]);

  const disable = useCallback(async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
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
