'use client';

import { useEffect, useRef, useState } from 'react';

// نقشه فقط-نمایشی موقعیت آگهی (صفحه جزئیات)
// بهینه‌سازی: نقشه فقط وقتی نزدیک ویوپورت شد بارگذاری می‌شود (IntersectionObserver)
// + نمایش اسکلت لودینگ تا آماده شدن کاشی‌ها (بازخورد فوری به کاربر)
export default function AdMap({ lat, lng }) {
  const el = useRef(null);
  const mapRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // ۱) فقط وقتی نقشه نزدیک دیدِ کاربر شد، شروع به بارگذاری کن
  useEffect(() => {
    if (!el.current || visible) return;
    // اگر مرورگر IntersectionObserver ندارد، مستقیم بارگذاری کن
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: '300px' } // کمی زودتر از رسیدن به نقشه شروع کن
    );
    io.observe(el.current);
    return () => io.disconnect();
  }, [visible]);

  // ۲) بارگذاری Leaflet فقط بعد از مرئی‌شدن
  useEffect(() => {
    if (!visible || !lat || !lng) return;
    let cancelled = false;
    (async () => {
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');
      if (cancelled || !el.current || mapRef.current) return;

      const map = L.map(el.current, {
        zoomControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        touchZoom: false,
      }).setView([lat, lng], 14);

      const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      });
      // وقتی اولین کاشی‌ها آمد، اسکلت لودینگ را بردار
      tiles.on('load', () => {
        if (!cancelled) setLoaded(true);
      });
      tiles.addTo(map);

      // دایره محدوده تقریبی (مثل دیوار، موقعیت دقیق لو نمی‌رود)
      L.circle([lat, lng], {
        radius: 500,
        color: '#a62626',
        fillColor: '#a62626',
        fillOpacity: 0.15,
        weight: 2,
      }).addTo(map);

      // اطمینان از اندازهٔ درست بعد از mount
      setTimeout(() => map.invalidateSize(), 0);
      // در صورت کندیِ شبکه، حداکثر بعد از ۲.۵ ثانیه اسکلت را بردار
      setTimeout(() => {
        if (!cancelled) setLoaded(true);
      }, 2500);

      mapRef.current = map;
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [visible, lat, lng]);

  if (!lat || !lng) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200">
      <div className="relative h-56 w-full">
        <div ref={el} className="h-56 w-full" />
        {/* اسکلت لودینگ تا آماده‌شدن نقشه */}
        {!loaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gray-100 dark:bg-gray-800">
            <svg
              className="animate-spin text-brand"
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M21 12a9 9 0 1 1-6.2-8.56" strokeLinecap="round" />
            </svg>
            <span className="text-xs text-gray-400">در حال بارگذاری نقشه…</span>
          </div>
        )}
      </div>
      <a
        href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`}
        target="_blank"
        rel="noreferrer"
        className="block bg-gray-50 py-2 text-center text-xs text-brand hover:bg-gray-100"
      >
        مشاهده در نقشه بزرگ‌تر ↗
      </a>
    </div>
  );
}
