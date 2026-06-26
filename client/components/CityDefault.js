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
    if (saved) {
      router.replace(`/?city=${encodeURIComponent(saved)}`);
    }
    // فقط یک‌بار هنگام mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
