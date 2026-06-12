'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { digitsOnly } from '../lib/api';
import { cityLabel, parseCities } from '../lib/cities';
import CityModal from './CityModal';

/* پیدا کردن مسیر (اجداد) دستهٔ فعال در درخت چندسطحی */
function findPath(nodes, slug, path = []) {
  for (const n of nodes) {
    if (n.slug === slug) return [...path, n.slug];
    if (n.children?.length) {
      const found = findPath(n.children, slug, [...path, n.slug]);
      if (found) return found;
    }
  }
  return null;
}

export default function CategorySidebar({ tree = [] }) {
  const router = useRouter();
  const params = useSearchParams();
  const active = params.get('category') || '';

  // مسیر فعال → همه سطوح والد باز بمانند
  const activePath = active ? findPath(tree, active) || [] : [];
  const [openSet, setOpenSet] = useState(() => new Set(activePath));
  const [cityOpen, setCityOpen] = useState(false);
  const cities = parseCities(params.get('city'));

  const setParam = (key, value) => {
    const sp = new URLSearchParams(params.toString());
    if (value) sp.set(key, value);
    else sp.delete(key);
    sp.delete('page');
    router.push(`/?${sp.toString()}`);
  };

  const pickCategory = (slug) => setParam('category', slug);
  const toggleOpen = (slug) =>
    setOpenSet((prev) => {
      const next = new Set(prev);
      next.has(slug) ? next.delete(slug) : next.add(slug);
      return next;
    });

  const hasFilter =
    active || params.get('city') || params.get('minPrice') || params.get('maxPrice') || params.get('q');

  /* رندر بازگشتی گره دسته — تا ۳ سطح */
  const renderNode = (node, depth = 0) => {
    const isActive = active === node.slug;
    const isOpen = openSet.has(node.slug);
    const hasChildren = node.children?.length > 0;
    const sizes = ['text-sm', 'text-[13px]', 'text-xs'];

    return (
      <li key={node._id}>
        <div className="flex items-center">
          <button
            onClick={() => {
              pickCategory(isActive ? '' : node.slug);
              if (hasChildren && !isOpen) toggleOpen(node.slug);
            }}
            className={`flex-1 py-1.5 text-right transition hover:text-brand ${sizes[depth] || 'text-xs'} ${
              isActive ? 'font-bold text-brand' : depth === 0 ? 'text-gray-700' : 'text-gray-500'
            }`}
          >
            {depth === 0 && <span className="ml-2 text-base leading-none">{node.icon}</span>}
            {node.name}
          </button>
          {hasChildren && (
            <button
              onClick={() => toggleOpen(node.slug)}
              aria-label={isOpen ? 'بستن' : 'باز کردن'}
              className="px-1.5 py-1.5 text-[9px] text-gray-300 transition hover:text-brand"
            >
              <span className={`inline-block transition-transform ${isOpen ? '-rotate-90' : ''}`}>◀</span>
            </button>
          )}
        </div>
        {hasChildren && isOpen && (
          <ul className="mr-3 border-r border-gray-200 pr-3">
            {node.children.map((c) => renderNode(c, depth + 1))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <aside className="md:sticky md:top-[76px] md:max-h-[calc(100dvh-92px)] md:self-start md:overflow-y-auto md:pb-4">
      <div className="space-y-6 text-sm lg:border-l lg:border-gray-100 lg:pl-5">
        {/* موبایل: چیپ‌های افقی دسته‌ها */}
        <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 md:hidden">
          <a
            href="/categories"
            className="flex flex-shrink-0 items-center gap-1.5 rounded-full border border-brand bg-brand-light px-3.5 py-2 text-xs font-bold text-brand"
          >
            🗂️ همهٔ دسته‌ها
          </a>
          {tree.map((p) => (
            <button
              key={p._id}
              onClick={() => pickCategory(active === p.slug ? '' : p.slug)}
              className={`flex-shrink-0 rounded-full border px-3.5 py-2 text-xs transition ${
                activePath[0] === p.slug
                  ? 'border-brand bg-brand font-bold text-white'
                  : 'border-gray-200 bg-white text-gray-600'
              }`}
            >
              {p.icon} {p.name}
            </button>
          ))}
        </div>

        {/* دسکتاپ: درخت ۳ سطحی */}
        <div className="hidden md:block">
          <h2 className="mb-3 text-xs font-bold text-gray-400">دسته‌ها</h2>
          <ul className="space-y-0.5">
            <li>
              <button
                onClick={() => {
                  pickCategory('');
                  setOpenSet(new Set());
                }}
                className={`w-full py-1.5 text-right text-sm transition hover:text-brand ${!active ? 'font-bold text-brand' : 'text-gray-700'}`}
              >
                همهٔ آگهی‌ها
              </button>
            </li>
            {tree.map((p) => renderNode(p, 0))}
          </ul>
        </div>

        <hr className="hidden border-gray-100 md:block" />

        {/* شهر — در موبایل از دکمه بالای صفحه انتخاب می‌شود */}
        <div className="hidden md:block">
          <h2 className="mb-3 text-xs font-bold text-gray-400">شهر</h2>
          <button
            onClick={() => setCityOpen(true)}
            className="flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-right outline-none transition hover:border-brand"
          >
            <span className={cities.length ? 'font-bold text-gray-800' : 'text-gray-500'}>
              {cityLabel(cities)}
            </span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
              <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z" /><circle cx="12" cy="10" r="3" />
            </svg>
          </button>
          {cities.length > 1 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {cities.map((c) => (
                <span key={c} className="rounded-full bg-brand-light px-2 py-0.5 text-[10px] font-bold text-brand">
                  {c}
                </span>
              ))}
            </div>
          )}
          <CityModal
            open={cityOpen}
            onClose={() => setCityOpen(false)}
            selected={cities}
            onApply={(list) => setParam('city', list.join(','))}
          />
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
            className="hidden w-full rounded-lg border border-gray-200 py-2 text-xs text-gray-500 transition hover:border-brand hover:text-brand md:block"
          >
            ✕ حذف همهٔ فیلترها
          </button>
        )}
      </div>
    </aside>
  );
}
