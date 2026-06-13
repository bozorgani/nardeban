'use client';

import { useEffect, useState } from 'react';

/**
 * 🌙 دکمه‌ی تغییر تم (روشن/تاریک)
 *
 * - کلاس `.dark` روی <html> را تاگل می‌کند.
 * - انتخاب کاربر در localStorage ذخیره می‌شود.
 * - جلوگیری از پرش اولیه با اسکریپت inline در layout.js انجام می‌شود؛
 *   این کامپوننت فقط وضعیت فعلی را می‌خواند و با آن همگام می‌ماند.
 *
 * پراپ‌ها:
 *   className: کلاس‌های ظاهری دکمه (برای هماهنگی با هدر / نوار پایین)
 */
export default function ThemeToggle({ className = '' }) {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggle = () => {
    const next = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light');
    } catch (e) {
      /* فضای ذخیره‌سازی در دسترس نیست — نادیده */
    }
    setDark(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={mounted ? (dark ? 'تغییر به حالت روشن' : 'تغییر به حالت تاریک') : 'تغییر تم'}
      title={mounted ? (dark ? 'حالت روشن' : 'حالت تاریک') : 'تغییر تم'}
      className={className}
    >
      {/* تا قبل از mount، آیکون خورشید نشان داده می‌شود تا عدم تطابق hydration رخ ندهد */}
      {mounted && dark ? (
        // آیکون خورشید (در حالت تاریک → برای رفتن به روشن)
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      ) : (
        // آیکون ماه (در حالت روشن → برای رفتن به تاریک)
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}
