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

    const inject = () => {
      if (document.getElementById('noncritical-styles')) return;
      const link = document.createElement('link');
      link.id = 'noncritical-styles';
      link.rel = 'stylesheet';
      link.href = '/styles/noncritical.css';
      document.head.appendChild(link);
    };

    // این CSS برای first paint لازم نیست؛ پس تا idle browser صبر می‌کنیم.
    const id = window.requestIdleCallback
      ? window.requestIdleCallback(inject, { timeout: 1500 })
      : setTimeout(inject, 200);

    return () => {
      if (window.cancelIdleCallback && typeof id === 'number') {
        try { window.cancelIdleCallback(id); } catch { clearTimeout(id); }
      } else {
        clearTimeout(id);
      }
      // عمداً link را حذف نمی‌کنیم: این استایل باید در کل عمر SPA باقی بماند.
    };
  }, []);

  return null;
}
