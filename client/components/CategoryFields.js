'use client';

import { useEffect, useState } from 'react';
import { api, digitsOnly } from '../lib/api';

/**
 * فرم فیلدهای اختصاصی دسته (برند/سال/متراژ/...)
 * props: categorySlug | categoryId — values: {key: value} — onChange(values)
 */
export default function CategoryFields({ categorySlug, categoryId, values = {}, onChange }) {
  const [fields, setFields] = useState([]);

  useEffect(() => {
    const q = categorySlug ? `slug=${categorySlug}` : categoryId ? `id=${categoryId}` : null;
    if (!q) return setFields([]);
    api(`/categories/fields?${q}`)
      .then((d) => setFields(d.fields || []))
      .catch(() => setFields([]));
  }, [categorySlug, categoryId]);

  if (!fields.length) return null;

  const set = (key, val) => onChange({ ...values, [key]: val });

  const inputCls =
    'w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-brand bg-white';

  return (
    <div className="space-y-4">
      <h3 className="flex items-center gap-2 text-sm font-extrabold text-gray-800">
        <span className="h-4 w-1 rounded-full bg-brand" />
        مشخصات
      </h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f.key}>
            <label className="mb-1.5 block text-sm font-bold text-gray-700">{f.label}</label>
            {f.type === 'select' ? (
              <select
                value={values[f.key] || ''}
                onChange={(e) => set(f.key, e.target.value)}
                className={inputCls}
              >
                <option value="">انتخاب کنید...</option>
                {f.options.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            ) : f.type === 'year' ? (
              <select
                value={values[f.key] || ''}
                onChange={(e) => set(f.key, e.target.value)}
                className={inputCls}
              >
                <option value="">انتخاب کنید...</option>
                {Array.from({ length: f.max - f.min + 1 }, (_, i) => f.max - i).map((y) => (
                  <option key={y} value={y}>{y.toLocaleString('fa-IR').replace(/٬/g, '')}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                inputMode="numeric"
                value={values[f.key] ? Number(values[f.key]).toLocaleString('fa-IR') : ''}
                onChange={(e) => set(f.key, digitsOnly(e.target.value))}
                placeholder={f.unit || ''}
                className={inputCls}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
