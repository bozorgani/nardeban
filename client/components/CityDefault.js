'use client';

/**
 * هدایت نرم به شهر ذخیره‌شدهٔ کاربر در صفحهٔ اصلی (مورد ۱۱).
 * فقط وقتی هیچ فیلتری در URL نیست و کاربر قبلاً شهری انتخاب کرده،
 * یک‌بار به /?city=... هدایت می‌شود تا فید پیش‌فرض شهر خودش باشد.
 * چیزی رندر نمی‌کند.
 */
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function CityDefault() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    // اگر هر فیلتری در URL هست (شهر/دسته/جستجو/...) → دخالت نکن
    if ([...params.keys()].length > 0) return;
    let saved = null;
    try {
      saved = localStorage.getItem('nardeban_city');
    } catch { /* ignore */ }
    if (!saved) return;

    // ⚡ هدایت را تا بعد از رنگ‌آمیزی اولیه (LCP) به تعویق می‌اندازیم.
    // قبلاً router.replace بلافاصله هنگام hydration اجرا می‌شد و یک رندر/فچ
    // دوبارهٔ کامل ایجاد می‌کرد که LCP موبایل را ~۵ ثانیه عقب می‌انداخت.
    // با تعویق به idle، کاربر ابتدا فید سراسری را فوری می‌بیند، سپس به
    // فید شهر خودش نرم هدایت می‌شود (بدون مسدودکردن نمایش اولیه).
    const go = () => router.replace(`/?city=${encodeURIComponent(saved)}`);
    const id =
      typeof window !== 'undefined' && 'requestIdleCallback' in window
        ? window.requestIdleCallback(go, { timeout: 1500 })
        : setTimeout(go, 600);

    return () => {
      if (typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback?.(id);
      } else {
        clearTimeout(id);
      }
    };
    // فقط یک‌بار هنگام mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
