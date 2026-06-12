import { Suspense } from 'react';
import AdFeed from '../components/AdFeed';
import CategorySidebar from '../components/CategorySidebar';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const PAGE_SIZE = 24; // تعداد آگهی در هر تکه

async function getData(searchParams) {
  const sp = new URLSearchParams();
  for (const key of ['q', 'category', 'city', 'minPrice', 'maxPrice', 'sort']) {
    if (searchParams[key]) sp.set(key, searchParams[key]);
  }
  // فیلترهای اختصاصی دسته (attr_brand و...)
  for (const [k, v] of Object.entries(searchParams)) {
    if (k.startsWith('attr_') && v) sp.set(k, v);
  }
  sp.set('limit', String(PAGE_SIZE));
  sp.set('page', '1'); // فقط صفحه اول در سرور — بقیه با اسکرول

  try {
    const [adsRes, catsRes] = await Promise.all([
      fetch(`${API}/api/ads?${sp.toString()}`, { cache: 'no-store' }),
      fetch(`${API}/api/categories`, { next: { revalidate: 300 } }),
    ]);
    const adsData = await adsRes.json();
    const catsData = await catsRes.json();
    return {
      ...adsData,
      tree: catsData.tree || [],
      allCats: catsData.categories || [],
      query: sp.toString(),
    };
  } catch {
    return { ads: [], total: 0, pages: 0, tree: [], allCats: [], query: '', error: true };
  }
}

// متادیتای پویا برای SEO
export async function generateMetadata({ searchParams }) {
  const params = await searchParams;
  const parts = [];
  if (params.q) parts.push(`جستجوی ${params.q}`);
  if (params.city) {
    const cities = String(params.city).split(',').filter(Boolean);
    parts.push(cities.length === 1 ? `در ${cities[0]}` : `در ${cities.length} شهر`);
  }
  const title = parts.length
    ? `${parts.join(' ')} | نردبان`
    : 'نردبان | نیازمندی‌های رایگان سراسر ایران';
  return { title, description: 'خرید و فروش، استخدام، املاک و خودرو — آگهی‌های دست دوم و نو' };
}

export default async function HomePage({ searchParams }) {
  const params = await searchParams;
  const { ads, total, pages, tree, allCats, query, error } = await getData(params);

  // عنوان پویا بر اساس فیلترهای فعال
  const activeCat = allCats.find((c) => c.slug === params.category);
  const titleParts = [];
  if (params.q) titleParts.push(`جستجوی «${params.q}»`);
  if (activeCat) titleParts.push(activeCat.name);
  if (params.city) {
    const cityList = String(params.city).split(',').filter(Boolean);
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

            {/* صفحه اول SSR شده؛ بقیه با اسکرول لود می‌شوند */}
            <AdFeed
              key={query} /* تغییر فیلتر → ریست کامل فید */
              initialAds={ads}
              total={total}
              pages={pages}
              query={query}
            />
          </>
        )}
      </section>
    </div>
  );
}
