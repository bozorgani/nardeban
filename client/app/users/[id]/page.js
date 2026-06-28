import Link from 'next/link';
import { cache } from 'react';
import AdCard from '../../../components/AdCard';
import RatingSection from './RatingSection';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// cache(): در یک درخواست SSR، getProfile فقط یک‌بار fetch می‌شود حتی اگر هم در
// generateMetadata و هم در خود صفحه صدا زده شود (حذف fetch دوبارهٔ پروفایل).
const getProfile = cache(async (id) => {
  try {
    // این صفحه عمومی است و محتوای آن لحظه‌به‌لحظه بحرانی نیست؛ no-store باعث
    // می‌شد HTML صفحه غیرقابل بازگشت از bfcache/restore-friendly شود.
    // با revalidate کوتاه، هم UX back/forward بهتر می‌شود و هم داده خیلی کهنه نمی‌ماند.
    const res = await fetch(`${API}/api/users/${id}/profile`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
});

export async function generateMetadata({ params }) {
  const { id } = await params;
  const data = await getProfile(id);
  if (!data) return { title: 'کاربر یافت نشد | بفروش' };
  return {
    title: `آگهی‌های ${data.seller.name} | بفروش`,
    description: `${data.totalAds} آگهی فعال از ${data.seller.name} در بفروش`,
  };
}

function Stars({ value, size = 16 }) {
  return (
    <span className="inline-flex items-center gap-0.5" dir="ltr">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg
          key={s}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill={value >= s ? '#f59e0b' : value >= s - 0.5 ? 'url(#half)' : '#e5e7eb'}
        >
          <defs>
            <linearGradient id="half">
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="50%" stopColor="#e5e7eb" />
            </linearGradient>
          </defs>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </span>
  );
}

export default async function SellerProfilePage({ params }) {
  const { id } = await params;
  const data = await getProfile(id);

  if (!data) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
        <p className="mb-2 text-4xl">👤</p>
        <p className="font-bold text-gray-700">کاربر یافت نشد</p>
        <Link href="/" className="mt-2 inline-block text-sm text-brand underline">
          بازگشت به صفحه اصلی
        </Link>
      </div>
    );
  }

  const { seller, ads, totalAds, soldCount, rating } = data;
  const memberSince = new Date(seller.memberSince).toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: 'long',
  });

  return (
    <div className="mx-auto max-w-5xl">
      {/* بردکرامب */}
      <nav className="mb-5 flex items-center gap-1.5 text-sm text-gray-400">
        <Link href="/" className="hover:text-brand">بفروش</Link>
        <span>›</span>
        <span className="text-gray-600">پروفایل {seller.name}</span>
      </nav>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_1fr]">
        {/* ===== ستون راست: کارت پروفایل + امتیازدهی ===== */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center lg:sticky lg:top-20">
            <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-light text-3xl font-black text-brand">
              {seller.name.charAt(0)}
            </span>
            <h1 className="mt-3 text-xl font-extrabold text-gray-900">{seller.name}</h1>
            <p className="mt-1 text-sm text-gray-400">
              {seller.city} · عضو از {memberSince}
            </p>

            {/* خلاصه امتیاز */}
            <div className="mt-4 flex items-center justify-center gap-2">
              <Stars value={rating.avg} size={18} />
              <span className="text-lg font-extrabold text-gray-800">
                {rating.count ? rating.avg.toLocaleString('fa-IR') : '—'}
              </span>
              <span className="text-xs text-gray-400">
                ({Number(rating.count).toLocaleString('fa-IR')} نظر)
              </span>
            </div>

            {/* توزیع ستاره‌ها */}
            {rating.count > 0 && (
              <div className="mt-4 space-y-1.5">
                {[5, 4, 3, 2, 1].map((s) => {
                  const cnt = rating.distribution[s] || 0;
                  const pct = rating.count ? Math.round((cnt / rating.count) * 100) : 0;
                  return (
                    <div key={s} className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="w-8">{s.toLocaleString('fa-IR')} ⭐</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                        <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-8 text-left">{cnt.toLocaleString('fa-IR')}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* آمار */}
            <div className="mt-5 grid grid-cols-2 gap-2 border-t border-gray-100 pt-4">
              <div className="rounded-xl bg-gray-50 py-3">
                <p className="text-lg font-extrabold text-gray-800">
                  {Number(totalAds).toLocaleString('fa-IR')}
                </p>
                <p className="text-xs text-gray-400">آگهی فعال</p>
              </div>
              <div className="rounded-xl bg-gray-50 py-3">
                <p className="text-lg font-extrabold text-gray-800">
                  {Number(soldCount).toLocaleString('fa-IR')}
                </p>
                <p className="text-xs text-gray-400">فروخته شده</p>
              </div>
            </div>
          </div>

          {/* امتیازدهی + نظرات (کلاینت) */}
          <RatingSection sellerId={String(seller.id)} />
        </div>

        {/* ===== ستون چپ: آگهی‌های فروشنده ===== */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-extrabold text-gray-800">
              آگهی‌های {seller.name}
            </h2>
            <span className="text-xs text-gray-400">
              {Number(totalAds).toLocaleString('fa-IR')} آگهی فعال
            </span>
          </div>

          {ads.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
              <p className="mb-2 text-4xl">📭</p>
              <p className="font-bold text-gray-700">آگهی فعالی ندارد</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {ads.map((ad) => (
                <AdCard key={ad._id} ad={ad} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
