'use client';

import { useEffect, useRef } from 'react';

// نقشه فقط-نمایشی موقعیت آگهی (صفحه جزئیات)
export default function AdMap({ lat, lng }) {
  const el = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!lat || !lng) return;
    let cancelled = false;
    (async () => {
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');
      if (cancelled || !el.current || mapRef.current) return;

      const map = L.map(el.current, {
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        touchZoom: false,
      }).setView([lat, lng], 14);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

      // دایره محدوده تقریبی (مثل دیوار، موقعیت دقیق لو نمی‌رود)
      L.circle([lat, lng], {
        radius: 500,
        color: '#a62626',
        fillColor: '#a62626',
        fillOpacity: 0.15,
        weight: 2,
      }).addTo(map);

      mapRef.current = map;
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [lat, lng]);

  if (!lat || !lng) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200">
      <div ref={el} className="h-56 w-full" />
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
