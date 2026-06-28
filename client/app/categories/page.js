import Link from 'next/link';

/**
 * صفحه دسته‌بندی‌ها — Server Component با SEO کامل (F8)
 * ----------------------------------------------------------------------------
 * قبلاً 'use client' بود → بات‌ها هیچ لینکی روی این صفحه نمی‌دیدند (HTML خالی)
 * و سئوی یک صفحهٔ ناوبری کلیدی کاملاً از دست رفته بود.
 *
 * حالا:
 *   - SSR کامل با fetch دسته‌ها (با کش ۵ دقیقه‌ای → TTFB سریع و ترافیک کم).
 *   - بات‌ها تمام لینک‌های دسته/زیردسته را در HTML اولیه می‌بینند.
 *   - drilldown سطح ۲ با URL search param (?parent=slug) → کاملاً SSRable +
 *     deep-link پذیر + قابل اشتراک‌گذاری.
 *   - generateMetadata پویا برای دسته انتخابی → title/description بهتر.
 */

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function getTree() {
  try {
    const res = await fetch(`${API}/api/categories`, { next: { revalidate: 300 } });
    if (!res.ok) return { tree: [] };
    return await res.json();
  } catch {
    return { tree: [] };
  }
}

export async function generateMetadata({ searchParams }) {
  const params = await searchParams;
  const parentSlug = params?.parent;
  if (parentSlug) {
    const { tree = [] } = await getTree();
    const parent = tree.find((c) => c.slug === parentSlug);
    if (parent) {
      return {
        title: `${parent.name} — دسته‌بندی‌ها | بفروش`,
        description: `همه زیردسته‌ها و آگهی‌های ${parent.name} در سراسر ایران`,
      };
    }
  }
  return {
    title: 'دسته‌بندی‌ها | بفروش',
    description:
      'فهرست کامل دسته‌بندی‌های آگهی در بفروش — املاک، خودرو، استخدام، لوازم منزل و بیشتر.',
  };
}

export default async function CategoriesPage({ searchParams }) {
  const params = await searchParams;
  const parentSlug = params?.parent || null;
  const { tree = [] } = await getTree();

  /* ---------- سطح ۲: زیردسته‌ها ---------- */
  if (parentSlug) {
    const parent = tree.find((c) => c.slug === parentSlug);
    if (!parent) {
      // slug نامعتبر → برگشت به سطح ۱ به‌جای 404 (تجربهٔ ملایم)
      return <BackToLevelOne />;
    }

    return (
      <div className="mx-auto max-w-md">
        {/* بازگشت به سطح ۱ — لینک واقعی، نه دکمهٔ state */}
        <Link
          href="/categories"
          className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-gray-600 transition hover:text-brand"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100">→</span>
          بازگشت به همهٔ دسته‌ها
        </Link>

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

  /* ---------- سطح ۱: گرید تایل‌های آیکونی ---------- */
  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-4 text-xl font-extrabold text-gray-900">دسته‌بندی‌ها</h1>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {tree.map((p) => {
          // اگر زیردسته دارد → به سطح ۲ (همان صفحه ?parent=slug)
          // اگر ندارد → مستقیم به لیست آگهی‌های دسته
          const href = p.children?.length
            ? `/categories?parent=${p.slug}`
            : `/?category=${p.slug}`;
          return (
            <Link
              key={p._id}
              href={href}
              className="fade-up group flex flex-col items-center gap-2 rounded-2xl border border-gray-100 bg-white p-4 transition hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-md"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 text-3xl transition group-hover:scale-110">
                {p.icon}
              </span>
              <span className="w-full truncate text-center text-xs font-bold leading-5 text-gray-700">
                {p.name}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function BackToLevelOne() {
  return (
    <div className="mx-auto max-w-md py-12 text-center">
      <p className="mb-4 text-gray-500">دسته‌بندی موردنظر یافت نشد.</p>
      <Link
        href="/categories"
        className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-bold text-white"
      >
        بازگشت به همهٔ دسته‌ها
      </Link>
    </div>
  );
}
