'use client';

import { useEffect } from 'react';

/**
 * لود غیرمسدودکنندهٔ CSS غیر بحرانی
 * --------------------------------------------------------------------------
 * این فایل سبک‌های پایین‌اولویت را بعد از hydrate به صفحه تزریق می‌کند تا:
 *   ۱) CSS بحرانیِ اولین رنگ‌آمیزی inline بماند
 *   ۲) درخواست render-blocking برای استایل‌های غیرضروریِ above-the-fold حذف شود
 *   ۳) dark-mode overrides، انیمیشن‌ها و scrollbar بعداً بار شوند
 *
 * نکته: id ثابت می‌گذاریم تا در route transition چندبار تزریق نشود.
 */
export default function NonCriticalStyles() {
  useEffect(() => {
    if (document.getElementById('noncritical-styles')) return;

    const link = document.createElement('link');
    link.id = 'noncritical-styles';
    link.rel = 'stylesheet';
    link.href = '/styles/noncritical.css';
    document.head.appendChild(link);

    return () => {
      // عمداً حذف نمی‌کنیم: این استایل باید در کل عمر SPA باقی بماند.
    };
  }, []);

  return null;
}
