'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { PROVINCES, ALL_CITIES } from '../lib/cities';

/**
 * مودال تمام‌صفحه انتخاب شهر/شهرستان با قابلیت انتخاب چندتایی
 * props:
 *  open, onClose
 *  selected: string[]            شهرهای انتخاب‌شده فعلی
 *  onApply: (cities: string[]) => void
 */
export default function CityModal({ open, onClose, selected = [], onApply }) {
  const [picked, setPicked] = useState(selected);
  const [query, setQuery] = useState('');
  const [openProvince, setOpenProvince] = useState(null);

  // هر بار باز شدن، با انتخاب فعلی sync شود
  useEffect(() => {
    if (open) {
      setPicked(selected);
      setQuery('');
      // استانِ اولین شهر انتخابی باز باشد
      const prov = PROVINCES.find((p) => p.cities.includes(selected[0]))?.name || null;
      setOpenProvince(prov);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // قفل اسکرول پس‌زمینه
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const toggleCity = (city) =>
    setPicked((prev) =>
      prev.includes(city) ? prev.filter((c) => c !== city) : [...prev, city]
    );

  // انتخاب/حذف کل استان
  const toggleProvince = (prov) => {
    const all = prov.cities;
    const allPicked = all.every((c) => picked.includes(c));
    setPicked((prev) =>
      allPicked ? prev.filter((c) => !all.includes(c)) : [...new Set([...prev, ...all])]
    );
  };

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return null;
    return ALL_CITIES.filter(
      (c) => c.city.includes(q) || c.province.includes(q)
    ).slice(0, 30);
  }, [query]);

  if (!open || typeof document === 'undefined') return null;

  // Portal روی body — وگرنه backdrop-blur هدر، position:fixed را خراب می‌کند
  return createPortal(
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true">
      {/* پس‌زمینه */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />

      {/* بدنه مودال: تمام صفحه در موبایل، وسط در دسکتاپ */}
      <div ref={dialogRef} className="absolute inset-0 flex flex-col overflow-hidden bg-white md:inset-auto md:left-1/2 md:top-1/2 md:h-[85vh] md:w-[480px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:shadow-2xl">
        {/* هدر */}
        <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3.5">
          <button onClick={onClose} aria-label="بستن" className="text-2xl leading-none text-gray-400 hover:text-gray-600">
            ✕
          </button>
          <h2 className="flex-1 text-base font-extrabold text-gray-800">انتخاب شهر</h2>
          {picked.length > 0 && (
            <button onClick={() => setPicked([])} className="text-xs font-bold text-brand">
              حذف همه ({picked.length.toLocaleString('fa-IR')})
            </button>
          )}
        </div>

        {/* جستجو */}
        <div className="border-b border-gray-100 px-4 py-3">
          <div className="relative">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="جستجوی شهر یا استان..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pr-10 pl-3 text-sm outline-none transition focus:border-brand focus:bg-white"
              autoFocus
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
              </svg>
            </span>
          </div>
        </div>

        {/* چیپ‌های انتخاب‌شده */}
        {picked.length > 0 && (
          <div className="flex gap-2 overflow-x-auto border-b border-gray-100 px-4 py-2.5">
            {picked.map((c) => (
              <button
                key={c}
                onClick={() => toggleCity(c)}
                className="flex flex-shrink-0 items-center gap-1.5 rounded-full bg-brand-light px-3 py-1.5 text-xs font-bold text-brand"
              >
                {c} <span className="text-[10px]">✕</span>
              </button>
            ))}
          </div>
        )}

        {/* لیست */}
        <div className="flex-1 overflow-y-auto">
          {results ? (
            /* ---- نتایج جستجو ---- */
            results.length === 0 ? (
              <p className="py-10 text-center text-sm text-gray-400">شهری یافت نشد 🔎</p>
            ) : (
              <ul className="divide-y divide-gray-50">
                {results.map((r) => (
                  <li key={`${r.province}-${r.city}`}>
                    <button
                      onClick={() => toggleCity(r.city)}
                      className="flex w-full items-center justify-between px-5 py-3.5 text-right transition hover:bg-gray-50"
                    >
                      <span className="text-sm text-gray-800">
                        {r.city}
                        <span className="mr-2 text-xs text-gray-400">استان {r.province}</span>
                      </span>
                      <Checkbox checked={picked.includes(r.city)} />
                    </button>
                  </li>
                ))}
              </ul>
            )
          ) : (
            /* ---- آکاردئون استان‌ها ---- */
            <ul className="divide-y divide-gray-50">
              {PROVINCES.map((prov) => {
                const isOpen = openProvince === prov.name;
                const pickedCount = prov.cities.filter((c) => picked.includes(c)).length;
                const allPicked = pickedCount === prov.cities.length;
                return (
                  <li key={prov.name}>
                    <div className="flex items-center">
                      <button
                        onClick={() => setOpenProvince(isOpen ? null : prov.name)}
                        className="flex flex-1 items-center justify-between px-5 py-3.5 text-right transition hover:bg-gray-50"
                      >
                        <span className="text-sm font-bold text-gray-800">
                          {prov.name}
                          {pickedCount > 0 && (
                            <span className="mr-2 rounded-full bg-brand-light px-2 py-0.5 text-[10px] font-bold text-brand">
                              {pickedCount.toLocaleString('fa-IR')}
                            </span>
                          )}
                        </span>
                        <span className={`text-[10px] text-gray-300 transition-transform ${isOpen ? 'rotate-90' : ''}`}>◀</span>
                      </button>
                    </div>

                    {isOpen && (
                      <ul className="bg-gray-50/50 pb-1">
                        {/* انتخاب کل استان */}
                        <li>
                          <button
                            onClick={() => toggleProvince(prov)}
                            className="flex w-full items-center justify-between px-7 py-3 text-right transition hover:bg-gray-100/60"
                          >
                            <span className="text-sm font-bold text-brand">
                              همهٔ شهرهای {prov.name}
                            </span>
                            <Checkbox checked={allPicked} />
                          </button>
                        </li>
                        {prov.cities.map((c) => (
                          <li key={c}>
                            <button
                              onClick={() => toggleCity(c)}
                              className="flex w-full items-center justify-between px-7 py-3 text-right transition hover:bg-gray-100/60"
                            >
                              <span className="text-sm text-gray-700">{c}</span>
                              <Checkbox checked={picked.includes(c)} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* فوتر: تأیید */}
        <div className="border-t border-gray-100 bg-white px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <button
            onClick={() => {
              onApply(picked);
              onClose();
            }}
            className="w-full rounded-xl bg-brand py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-brand-dark"
          >
            {picked.length === 0
              ? 'نمایش همهٔ شهرها'
              : picked.length === 1
                ? `تأیید — ${picked[0]}`
                : `تأیید — ${picked.length.toLocaleString('fa-IR')} شهر`}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function Checkbox({ checked }) {
  return (
    <span
      className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2 text-[11px] text-white transition ${
        checked ? 'border-brand bg-brand' : 'border-gray-300 bg-white'
      }`}
    >
      {checked && '✓'}
    </span>
  );
}
