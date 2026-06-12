'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CITIES, digitsOnly } from '../lib/api';

export default function CategorySidebar({ tree = [] }) {
  const router = useRouter();
  const params = useSearchParams();
  const active = params.get('category') || '';

  const activeParent = tree.find(
    (p) => p.slug === active || p.children?.some((c) => c.slug === active)
  )?.slug;
  const [open, setOpen] = useState(activeParent || null);

  const setParam = (key, value) => {
    const sp = new URLSearchParams(params.toString());
    if (value) sp.set(key, value);
    else sp.delete(key);
    sp.delete('page');
    router.push(`/?${sp.toString()}`);
  };

  const pickCategory = (slug) => setParam('category', slug);
  const hasFilter =
    active || params.get('city') || params.get('minPrice') || params.get('maxPrice') || params.get('q');

  return (
    <aside className="space-y-6 text-sm lg:border-l lg:border-gray-100 lg:pl-5">
      {/* دسته‌ها — سبک دیوار: لیست متنی ساده */}
      <div>
        <h2 className="mb-3 text-xs font-bold text-gray-400">دسته‌ها</h2>
        <ul className="space-y-0.5">
          <li>
            <button
              onClick={() => { pickCategory(''); setOpen(null); }}
              className={`w-full py-1.5 text-right transition hover:text-brand ${!active ? 'font-bold text-brand' : 'text-gray-700'}`}
            >
              همهٔ آگهی‌ها
            </button>
          </li>
          {tree.map((p) => {
            const isOpen = open === p.slug;
            const isActive = active === p.slug;
            return (
              <li key={p._id}>
                <button
                  onClick={() => {
                    setOpen(isOpen ? null : p.slug);
                    pickCategory(p.slug);
                  }}
                  className={`flex w-full items-center justify-between py-1.5 text-right transition hover:text-brand ${isActive ? 'font-bold text-brand' : 'text-gray-700'}`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-base leading-none">{p.icon}</span> {p.name}
                  </span>
                  {p.children?.length > 0 && (
                    <span className={`text-[9px] text-gray-300 transition-transform ${isOpen ? '-rotate-90' : ''}`}>◀</span>
                  )}
                </button>
                {isOpen && p.children?.length > 0 && (
                  <ul className="mb-1 mr-4 space-y-0.5 border-r border-gray-200 pr-3">
                    {p.children.map((c) => (
                      <li key={c._id}>
                        <button
                          onClick={() => pickCategory(c.slug)}
                          className={`w-full py-1.5 text-right text-[13px] transition hover:text-brand ${active === c.slug ? 'font-bold text-brand' : 'text-gray-500'}`}
                        >
                          {c.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <hr className="hidden border-gray-100 md:block" />

      {/* شهر — در موبایل از دکمه بالای صفحه انتخاب می‌شود */}
      <div className="hidden md:block">
        <h2 className="mb-3 text-xs font-bold text-gray-400">شهر</h2>
        <select
          value={params.get('city') || ''}
          onChange={(e) => setParam('city', e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-2 outline-none focus:border-brand"
        >
          <option value="">همه شهرها</option>
          {CITIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* قیمت — فقط دسکتاپ */}
      <div className="hidden md:block">
        <h2 className="mb-3 text-xs font-bold text-gray-400">قیمت (تومان)</h2>
        <div className="flex items-center gap-2">
          <input
            type="text"
            inputMode="numeric"
            placeholder="از"
            defaultValue={params.get('minPrice') || ''}
            onBlur={(e) => setParam('minPrice', digitsOnly(e.target.value))}
            onKeyDown={(e) => e.key === 'Enter' && setParam('minPrice', digitsOnly(e.target.value))}
            className="w-1/2 rounded-lg border border-gray-300 px-2.5 py-2 outline-none focus:border-brand"
          />
          <span className="text-gray-300">—</span>
          <input
            type="text"
            inputMode="numeric"
            placeholder="تا"
            defaultValue={params.get('maxPrice') || ''}
            onBlur={(e) => setParam('maxPrice', digitsOnly(e.target.value))}
            onKeyDown={(e) => e.key === 'Enter' && setParam('maxPrice', digitsOnly(e.target.value))}
            className="w-1/2 rounded-lg border border-gray-300 px-2.5 py-2 outline-none focus:border-brand"
          />
        </div>
      </div>

      {/* مرتب‌سازی — فقط دسکتاپ */}
      <div className="hidden md:block">
        <h2 className="mb-3 text-xs font-bold text-gray-400">مرتب‌سازی</h2>
        <select
          value={params.get('sort') || 'newest'}
          onChange={(e) => setParam('sort', e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-2 outline-none focus:border-brand"
        >
          <option value="newest">جدیدترین</option>
          <option value="cheapest">ارزان‌ترین</option>
          <option value="expensive">گران‌ترین</option>
        </select>
      </div>

      {hasFilter && (
        <button
          onClick={() => router.push('/')}
          className="w-full rounded-lg border border-gray-200 py-2 text-xs text-gray-500 transition hover:border-brand hover:text-brand"
        >
          ✕ حذف همهٔ فیلترها
        </button>
      )}
    </aside>
  );
}
