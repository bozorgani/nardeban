'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import AdCard from './AdCard';
import { API_URL } from '../lib/api';

/**
 * فید آگهی‌ها با Infinite Scroll
 *  - صفحهٔ اول از سرور (SSR) می‌آید → SEO و سرعت اولیه عالی
 *  - صفحات بعدی با رسیدن اسکرول به انتهای لیست، تکه‌تکه fetch می‌شوند
 *  - IntersectionObserver با rootMargin بزرگ → قبل از رسیدن کاربر لود می‌شود (بدون مکث)
 *  - جلوگیری از درخواست تکراری + dedupe آگهی‌ها + دکمه تلاش مجدد در خطا
 */
// کلید کش فید per query در sessionStorage (UX-07)
const cacheKey = (query) => `feed:${query || 'home'}`;

export default function AdFeed({ initialAds, total, pages, query }) {
  // اگر برای همین query اسنپ‌شات کش‌شده داریم (بازگشت از صفحهٔ آگهی) → بازیابی فوری
  const restored =
    typeof window !== 'undefined'
      ? (() => {
          try {
            const raw = sessionStorage.getItem(cacheKey(query));
            return raw ? JSON.parse(raw) : null;
          } catch {
            return null;
          }
        })()
      : null;

  const [ads, setAds] = useState(restored?.ads?.length ? restored.ads : initialAds);
  const [page, setPage] = useState(restored?.page || 1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const sentinelRef = useRef(null);
  const loadingRef = useRef(false); // گارد همزمانی (state async است)

  const hasMore = page < pages;

  // ذخیرهٔ اسنپ‌شات فید + موقعیت اسکرول هنگام ترک صفحه (کلیک روی آگهی)
  useEffect(() => {
    const save = () => {
      try {
        sessionStorage.setItem(
          cacheKey(query),
          JSON.stringify({ ads, page, scrollY: window.scrollY })
        );
      } catch {
        /* سهمیهٔ sessionStorage پر است — بی‌خیال */
      }
    };
    // قبل از ناوبری/بستن، ذخیره کن
    window.addEventListener('pagehide', save);
    return () => {
      save();
      window.removeEventListener('pagehide', save);
    };
  }, [ads, page, query]);

  // بازیابی موقعیت اسکرول پس از mount (اگر از کش بازگشتیم)
  useEffect(() => {
    if (restored?.scrollY) {
      // بعد از رندر شدن کارت‌ها اسکرول را برگردان
      requestAnimationFrame(() => window.scrollTo(0, restored.scrollY));
    }
    // فقط یک‌بار هنگام mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || page >= pages) return;
    loadingRef.current = true;
    setLoading(true);
    setError(false);

    try {
      const sp = new URLSearchParams(query);
      sp.set('page', String(page + 1));
      const res = await fetch(`${API_URL}/api/ads?${sp.toString()}`);
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();

      setAds((prev) => {
        const seen = new Set(prev.map((a) => a._id));
        return [...prev, ...data.ads.filter((a) => !seen.has(a._id))];
      });
      setPage((p) => p + 1);
    } catch {
      setError(true);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [page, pages, query]);

  // مشاهده‌گر: وقتی سنتینل نزدیک viewport شد، صفحه بعد را بگیر
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !error) loadMore();
      },
      { rootMargin: '600px 0px' } // ۶۰۰px قبل از رسیدن، پیش‌لود کن
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore, hasMore, error]);

  return (
    <>
      {ads.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
          <p className="mb-2 text-4xl">🔎</p>
          <p className="font-bold text-gray-700">آگهی‌ای یافت نشد</p>
          <p className="mt-1 text-sm text-gray-400">
            فیلترها را تغییر دهید یا{' '}
            <Link href="/" className="text-brand underline">همهٔ آگهی‌ها</Link> را ببینید.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {ads.map((ad, i) => (
            // ۴ کارت اول با اولویت بالا بارگذاری می‌شوند (بهبود LCP موبایل)
            <AdCard key={ad._id} ad={ad} priority={i < 4} />
          ))}
        </div>
      )}

      {/* سنتینل + وضعیت‌ها */}
      <div ref={sentinelRef} className="mt-6">
        {loading && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3" aria-hidden>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex h-40 animate-pulse rounded-lg border border-gray-100 bg-white p-4">
                <div className="flex flex-1 flex-col justify-between pl-3">
                  <div className="space-y-2">
                    <div className="h-4 w-3/4 rounded bg-gray-100" />
                    <div className="h-4 w-1/2 rounded bg-gray-100" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-3.5 w-1/3 rounded bg-gray-100" />
                    <div className="h-3 w-1/2 rounded bg-gray-100" />
                  </div>
                </div>
                <div className="h-32 w-32 self-center rounded-md bg-gray-100" />
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="py-6 text-center">
            <p className="mb-3 text-sm text-gray-500">خطا در دریافت آگهی‌های بیشتر</p>
            <button
              onClick={loadMore}
              className="rounded-xl border border-brand px-6 py-2.5 text-sm font-bold text-brand transition hover:bg-brand-light"
            >
              تلاش مجدد
            </button>
          </div>
        )}

        {!hasMore && ads.length > 0 && (
          <p className="py-8 text-center text-sm text-gray-500">
            ✓ همهٔ {Number(total).toLocaleString('fa-IR')} آگهی نمایش داده شد
          </p>
        )}
      </div>
    </>
  );
}
