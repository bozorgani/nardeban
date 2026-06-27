'use client';

/**
 * دکمهٔ اشتراک‌گذاری آگهی (UX-06)
 * - اگر مرورگر Web Share API دارد (موبایل) → شیت اشتراک‌گذاری بومی
 * - وگرنه → کپی لینک در کلیپ‌بورد + توست تأیید
 */
import { useState } from 'react';
import { useToast } from './Toast';

export default function ShareButton({ title = 'آگهی در بفروش' }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  // کپی با fallback برای بافت غیرامن (HTTP) یا مرورگرهای قدیمی
  const copyToClipboard = async (text) => {
    // مسیر مدرن (نیاز به HTTPS/secure context)
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        /* به fallback می‌رویم */
      }
    }
    // fallback قدیمی: textarea مخفی + execCommand
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-9999px';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      ta.setSelectionRange(0, text.length);
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  };

  const onShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (!url) return;

    // Web Share API (عمدتاً موبایل) — لغو کاربر را نباید خطا حساب کنیم
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (err) {
        // اگر کاربر خودش لغو کرد، هیچ کاری نکن (نه کپی، نه خطا)
        if (err && err.name === 'AbortError') return;
        // در غیر این صورت → ادامه به کپی
      }
    }

    // fallback: کپی در کلیپ‌بورد
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopied(true);
      toast?.success('لینک آگهی کپی شد');
      setTimeout(() => setCopied(false), 2000);
    } else {
      // آخرین تلاش: نمایش لینک برای کپی دستی
      toast?.error('کپی خودکار ممکن نشد — لینک از نوار آدرس کپی کنید');
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
