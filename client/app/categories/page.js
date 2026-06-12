'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';

/**
 * صفحه دسته‌بندی‌ها (سبک دیوار — مخصوص موبایل، در دسکتاپ هم کار می‌کند)
 * سطح ۱: لیست دسته‌های اصلی با آیکون
 * سطح ۲: زیردسته‌های دسته انتخابی + «همهٔ آگهی‌های دسته»
 */
export default function CategoriesPage() {
  const router = useRouter();
  const [tree, setTree] = useState(null);
  const [parent, setParent] = useState(null); // دسته باز شده

  useEffect(() => {
    api('/categories')
      .then((d) => setTree(d.tree || []))
      .catch(() => setTree([]));
  }, []);

  if (tree === null)
    return <p className="py-16 text-center text-gray-400">در حال بارگذاری دسته‌بندی‌ها...</p>;

  /* ---------- سطح ۲: زیردسته‌ها ---------- */
  if (parent) {
    return (
      <div className="mx-auto max-w-md">
        <button
          onClick={() => setParent(null)}
          className="mb-4 flex items-center gap-2 text-sm font-bold text-gray-600 transition hover:text-brand"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100">→</span>
          بازگشت به همهٔ دسته‌ها
        </button>

        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-light text-2xl">
            {parent.icon}
          </span>
          <h1 className="text-lg font-extrabold text-gray-900">{parent.name}</h1>
        </div>

        <div className="divide-y divide-gray-50 overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <Link
            href={`/?category=${parent.slug}`}
            className="flex items-center justify-between px-5 py-4 font-bold text-brand transition hover:bg-gray-50"
          >
            همهٔ آگهی‌های {parent.name}
            <span className="text-gray-300">◀</span>
          </Link>
          {parent.children?.map((c) =>
            c.children?.length ? (
              <details key={c._id} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-gray-700 transition hover:bg-gray-50">
                  <span className="font-bold">{c.name}</span>
                  <span className="text-gray-300 transition-transform group-open:rotate-90">◀</span>
                </summary>
                <div className="bg-gray-50/60 pb-1">
                  <Link
                    href={`/?category=${c.slug}`}
                    className="block px-8 py-3 text-sm font-bold text-brand transition hover:bg-gray-100/70"
                  >
                    همهٔ آگهی‌های {c.name}
                  </Link>
                  {c.children.map((g) => (
                    <Link
                      key={g._id}
                      href={`/?category=${g.slug}`}
                      className="block px-8 py-3 text-sm text-gray-600 transition hover:bg-gray-100/70"
                    >
                      {g.name}
                    </Link>
                  ))}
                </div>
              </details>
            ) : (
              <Link
                key={c._id}
                href={`/?category=${c.slug}`}
                className="flex items-center justify-between px-5 py-4 text-gray-700 transition hover:bg-gray-50"
              >
                {c.name}
                <span className="text-gray-300">◀</span>
              </Link>
            )
          )}
        </div>
      </div>
    );
  }

  /* ---------- سطح ۱: دسته‌های اصلی ---------- */
  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-4 text-xl font-extrabold text-gray-900">🗂️ دسته‌بندی‌ها</h1>
      <div className="divide-y divide-gray-50 overflow-hidden rounded-2xl border border-gray-200 bg-white">
        {tree.map((p) => (
          <button
            key={p._id}
            onClick={() =>
              p.children?.length ? setParent(p) : router.push(`/?category=${p.slug}`)
            }
            className="flex w-full items-center gap-4 px-5 py-4 text-right transition hover:bg-gray-50"
          >
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gray-100 text-xl">
              {p.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-bold text-gray-800">{p.name}</span>
              {p.children?.length > 0 && (
                <span className="block truncate text-xs text-gray-400">
                  {p.children
                    .slice(0, 3)
                    .map((c) => c.name)
                    .join('، ')}
                  {p.children.length > 3 ? ' و...' : ''}
                </span>
              )}
            </span>
            <span className="text-gray-300">◀</span>
          </button>
        ))}
      </div>
    </div>
  );
}
