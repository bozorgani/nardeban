'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// مرکز پیش‌فرض: تهران
const DEFAULT_CENTER = [35.6892, 51.389];

/**
 * نقشه انتخاب موقعیت (Leaflet بدون react-leaflet برای سازگاری کامل با SSR)
 * props:
 *  value: {lat, lng} | null
 *  onChange: ({lat, lng}) => void
 *  onCityDetect: (cityName) => void  — تشخیص شهر با reverse-geocode
 */
export default function MapPicker({ value, onChange, onCityDetect }) {
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const LRef = useRef(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);

  const setMarker = useCallback((lat, lng, fly = true) => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      const icon = L.divIcon({
        className: '',
        html: `<div style="position:relative;width:34px;height:44px">
          <svg width="34" height="44" viewBox="0 0 34 44">
            <path d="M17 0C7.6 0 0 7.6 0 17c0 12.75 17 27 17 27s17-14.25 17-27C34 7.6 26.4 0 17 0z" fill="#a62626"/>
            <circle cx="17" cy="16" r="6.5" fill="#fff"/>
          </svg></div>`,
        iconSize: [34, 44],
        iconAnchor: [17, 44],
      });
      markerRef.current = L.marker([lat, lng], { icon, draggable: true }).addTo(map);
      markerRef.current.on('dragend', () => {
        const p = markerRef.current.getLatLng();
        onChange?.({ lat: p.lat, lng: p.lng });
        reverseGeocode(p.lat, p.lng);
      });
    }
    if (fly) map.flyTo([lat, lng], Math.max(map.getZoom(), 14), { duration: 0.6 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reverseGeocode = useCallback(
    async (lat, lng) => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=fa&zoom=12`
        );
        const data = await res.json();
        const city =
          data.address?.city || data.address?.town || data.address?.village || data.address?.county || '';
        if (city) onCityDetect?.(city.replace('شهرستان ', '').trim());
      } catch {
        /* آفلاین/خطا — مهم نیست */
      }
    },
    [onCityDetect]
  );

  // مقداردهی نقشه (فقط کلاینت)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');
      if (cancelled || !mapEl.current || mapRef.current) return;
      LRef.current = L;

      const start = value?.lat ? [value.lat, value.lng] : DEFAULT_CENTER;
      const map = L.map(mapEl.current, { zoomControl: false, attributionControl: false }).setView(
        start,
        value?.lat ? 14 : 11
      );
      L.control.zoom({ position: 'bottomleft' }).addTo(map);
      L.control.attribution({ position: 'bottomright', prefix: false })
        .addAttribution('© OpenStreetMap')
        .addTo(map);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      map.on('click', (e) => {
        setMarker(e.latlng.lat, e.latlng.lng, false);
        onChange?.({ lat: e.latlng.lat, lng: e.latlng.lng });
        reverseGeocode(e.latlng.lat, e.latlng.lng);
      });

      mapRef.current = map;
      if (value?.lat) setMarker(value.lat, value.lng, false);
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // جستجوی شهر/محله (debounced)
  useEffect(() => {
    if (query.trim().length < 2) return setResults([]);
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
            query + ' ایران'
          )}&format=json&accept-language=fa&limit=5`
        );
        const data = await res.json();
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 450);
    return () => clearTimeout(t);
  }, [query]);

  const pickResult = (r) => {
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lon);
    setMarker(lat, lng);
    onChange?.({ lat, lng });
    reverseGeocode(lat, lng);
    setResults([]);
    setQuery(r.display_name.split('،')[0].split(',')[0]);
  };

  const myLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const { latitude: lat, longitude: lng } = pos.coords;
        setMarker(lat, lng);
        onChange?.({ lat, lng });
        reverseGeocode(lat, lng);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div className="space-y-2">
      {/* جستجوی شهر/محله */}
      <div className="relative z-[1000]">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="جستجوی شهر یا محله... (مثلاً: تهران، سعادت‌آباد)"
          className="w-full rounded-xl border border-gray-300 py-2.5 pr-10 pl-3 text-sm outline-none focus:border-brand"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
          {searching ? (
            <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.2-8.56" strokeLinecap="round"/></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3" strokeLinecap="round"/></svg>
          )}
        </span>
        {results.length > 0 && (
          <ul className="absolute top-full right-0 left-0 mt-1 max-h-52 overflow-auto rounded-xl border border-gray-200 bg-white text-sm shadow-xl">
            {results.map((r) => (
              <li key={r.place_id}>
                <button
                  type="button"
                  onClick={() => pickResult(r)}
                  className="block w-full border-b border-gray-50 px-3 py-2.5 text-right last:border-0 hover:bg-gray-50"
                >
                  📍 {r.display_name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* نقشه */}
      <div className="relative overflow-hidden rounded-xl border border-gray-300">
        <div ref={mapEl} className="h-72 w-full sm:h-80" />
        <button
          type="button"
          onClick={myLocation}
          className="absolute left-3 top-3 z-[999] flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold shadow-md transition hover:bg-gray-50"
        >
          {locating ? (
            <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.2-8.56" strokeLinecap="round"/></svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3" strokeLinecap="round"/><circle cx="12" cy="12" r="8"/></svg>
          )}
          موقعیت من
        </button>
        {!value?.lat && (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 z-[999] mx-auto w-fit rounded-full bg-gray-900/80 px-4 py-1.5 text-xs text-white backdrop-blur">
            روی نقشه کلیک کنید تا موقعیت آگهی ثبت شود
          </div>
        )}
      </div>

      {value?.lat && (
        <p className="text-xs text-gray-400" dir="ltr">
          📌 {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
        </p>
      )}
    </div>
  );
}
