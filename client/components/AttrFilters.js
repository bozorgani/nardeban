'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, digitsOnly } from '../lib/api';

/**
 * فیلترهای اختصاصی دسته در سایدبار (فقط فیلدهای filter: true)
 * select → فیلتر دقیق | number/year → بازه min/max
 */
export default function AttrFilters() {
  const router = useRouter();
  const params = useSearchParams();
  const category = params.get('category');
  const [fields, setFields] = useState([]);

  useEffect(() => {
    if (!category) return setFields([]);
    api(`/categories/fields?slug=${category}`)
      .then((d) => setFields((d.fields || []).filter((f) => f.filter)))
      .catch(() => setFields([]));
  }, [category]);

  if (!fields.length) return null;

  const setParam = (key, value) => {
    const sp = new URLSearchParams(params.toString());
    if (value) sp.set(key, value);
    else sp.delete(key);
    sp.delete('page');
    router.push(`/?${sp.toString()}`);
  };

  return (
    <div className="hidden space-y-4 md:block">
      <h2 className="text-xs font-bold text-gray-400">فیلترهای تخصصی</h2>
      {fields.map((f) => {
        if (f.type === 'select') {
          return (
            <div key={f.key}>
              <h3 className="mb-1.5 text-xs text-gray-500">{f.label}</h3>
              <select
                value={params.get(`attr_${f.key}`) || ''}
                onChange={(e) => setParam(`attr_${f.key}`, e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-sm outline-none focus:border-brand"
              >
                <option value="">همه</option>
                {f.options.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
          );
        }
        // number / year → بازه
        return (
          <div key={f.key}>
            <h3 className="mb-1.5 text-xs text-gray-500">{f.label}</h3>
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                placeholder="از"
                defaultValue={params.get(`attr_${f.key}_min`) || ''}
                onBlur={(e) => setParam(`attr_${f.key}_min`, digitsOnly(e.target.value))}
                onKeyDown={(e) => e.key === 'Enter' && setParam(`attr_${f.key}_min`, digitsOnly(e.target.value))}
                className="w-1/2 rounded-lg border border-gray-300 px-2.5 py-2 text-sm outline-none focus:border-brand"
              />
              <span className="text-gray-300">—</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="تا"
                defaultValue={params.get(`attr_${f.key}_max`) || ''}
                onBlur={(e) => setParam(`attr_${f.key}_max`, digitsOnly(e.target.value))}
                onKeyDown={(e) => e.key === 'Enter' && setParam(`attr_${f.key}_max`, digitsOnly(e.target.value))}
                className="w-1/2 rounded-lg border border-gray-300 px-2.5 py-2 text-sm outline-none focus:border-brand"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
