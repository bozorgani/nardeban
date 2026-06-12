import { Suspense } from 'react';
import Link from 'next/link';
import AdCard from '../components/AdCard';
import CategorySidebar from '../components/CategorySidebar';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function getData(searchParams) {
  const sp = new URLSearchParams();
  for (const key of ['q', 'category', 'city', 'minPrice', 'maxPrice', 'sort', 'page']) {
    if (searchParams[key]) sp.set(key, searchParams[key]);
  }

  try {
    const [adsRes, catsRes] = await Promise.all([
      fetch(`${API}/api/ads?${sp.toString()}`, { cache: 'no-store' }),
      fetch(`${API}/api/categories`, { next: { revalidate: 300 } }),
    ]);
    const adsData = await adsRes.json();
    const catsData = await catsRes.json();
    return { ...adsData, tree: catsData.tree || [], allCats: catsData.categories || [] };
  } catch {
    return { ads: [], total: 0, page: 1, pages: 0, tree: [], allCats: [], error: true };
  }
}

export default async function HomePage({ searchParams }) {
  const params = await searchParams;
  const { ads, total, page, pages, tree, allCats, error } = await getData(params);

  const pageLink = (p) => {
    const sp = new URLSearchParams(params);
    sp.set('page', p);
    return `/?${sp.toString()}`;
  };

  // عنوان پویا بر اساس فیلترهای فعال
  const activeCat = allCats.find((c) => c.slug === params.category);
  const titleParts = [];
  if (params.q) titleParts.push(`جستجوی «${params.q}»`);
  if (activeCat) titleParts.push(activeCat.name);
  if (params.city) {
    const cityList = String(params.city).split(',').filter(Boolean);
    // یک شهر → نام شهر | چند شهر → «۲ شهر»
    titleParts.push(
      cityList.length === 1
        ? `در ${cityList[0]}`
        : `در ${cityList.length.toLocaleString('fa-IR')} شهر`
    );
  }
  const heading = titleParts.length ? titleParts.join(' ') : 'همهٔ آگهی‌ها';

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-[230px_1fr]">
      <Suspense fallback={null}>
        <CategorySidebar tree={tree} />
      </Suspense>

      <section>
        {error ? (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6 text-center text-sm">
            ⚠️ ارتباط با سرور برقرار نشد. مطمئن شوید بک‌اند روی پورت ۴۰۰۰ در حال اجراست.
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h1 className="text-base font-extrabold text-gray-800">{heading}</h1>
              <span className="text-xs text-gray-400">
                {Number(total).toLocaleString('fa-IR')} آگهی
              </span>
            </div>

            {ads.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
                <p className="mb-2 text-4xl">🔎</p>
                <p className="font-bold text-gray-700">آگهی‌ای یافت نشد</p>
                <p className="mt-1 text-sm text-gray-400">
                  فیلترها را تغییر دهید یا{' '}
                  <Link href="/" className="text-brand underline">همهٔ آگهی‌ها</Link> را ببینید.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                {ads.map((ad) => (
                  <AdCard key={ad._id} ad={ad} />
                ))}
              </div>
            )}

            {pages > 1 && (
              <div className="mt-8 flex justify-center gap-2 text-sm">
                {page > 1 && (
                  <Link href={pageLink(page - 1)} className="rounded-xl border border-gray-200 bg-white px-4 py-2 transition hover:border-brand hover:text-brand">
                    → قبلی
                  </Link>
                )}
                <span className="px-3 py-2 text-gray-400">
                  صفحه {Number(page).toLocaleString('fa-IR')} از {Number(pages).toLocaleString('fa-IR')}
                </span>
                {page < pages && (
                  <Link href={pageLink(page + 1)} className="rounded-xl border border-gray-200 bg-white px-4 py-2 transition hover:border-brand hover:text-brand">
                    بعدی ←
                  </Link>
                )}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
