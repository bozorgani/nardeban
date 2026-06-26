'use client';

/**
 * ثبت بازدید آگهی — یک‌بار هنگام باز شدن صفحه در مرورگر کاربر (FE-01).
 * جدا از خواندن SSR/متادیتا تا بازدید دوبار یا توسط بات شمارش نشود.
 * چیزی رندر نمی‌کند.
 */
import { useEffect, useRef } from 'react';
import { API_URL } from '../../../lib/api';

export default function ViewCounter({ adId }) {
  const sent = useRef(false);

  useEffect(() => {
    if (!adId || sent.current) return;
    sent.current = true; // گارد در برابر اجرای دوبارهٔ Strict Mode/ری‌رندر
    fetch(`${API_URL}/api/ads/${adId}/view`, {
      method: 'POST',
      keepalive: true,
    }).catch(() => {});
  }, [adId]);

  return null;
}
