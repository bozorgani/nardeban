'use client';

/**
 * دکمهٔ اشتراک‌گذاری آگهی (UX-06)
 * - اگر مرورگر Web Share API دارد (موبایل) → شیت اشتراک‌گذاری بومی
 * - وگرنه → کپی لینک در کلیپ‌بورد + توست تأیید
 */
import { useState } from 'react';
import { useToast } from './Toast';

export default function ShareButton({ title = 'آگهی در نردبان' }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  const onShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (!url) return;

    // Web Share API (عمدتاً موبایل)
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // کاربر لغو کرد یا خطا → ادامه به کپی
      }
    }

    // fallback: کپی در کلیپ‌بورد
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast?.success('لینک آگهی کپی شد');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast?.error('کپی لینک ممکن نشد');
    }
  };

  return (
    <button
      type="button"
      onClick={onShare}
      aria-label="اشتراک‌گذاری آگهی"
      title="اشتراک‌گذاری"
      className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs text-gray-400 transition hover:bg-gray-50 hover:text-brand"
    >
      {copied ? (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      ) : (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
          <path d="m8.6 13.5 6.8 4M15.4 6.5 8.6 10.5" />
        </svg>
      )}
      <span>{copied ? 'کپی شد' : 'اشتراک‌گذاری'}</span>
    </button>
  );
}
