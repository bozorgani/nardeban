'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, timeAgo } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { useToast } from '../../components/Toast';

function searchUrl(s) {
  const sp = new URLSearchParams();
  if (s.query) sp.set('q', s.query);
  if (s.category) sp.set('category', s.category);
  if (s.city) sp.set('city', s.city);
  if (s.minPrice != null) sp.set('minPrice', s.minPrice);
  if (s.maxPrice != null) sp.set('maxPrice', s.maxPrice);
  for (const [k, v] of Object.entries(s.attrs || {})) sp.set(`attr_${k}`, v);
  return `/?${sp.toString()}`;
}

export default function SavedSearchesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [data, setData] = useState(null);

  const load = () =>
    api('/saved-searches').then(setData).catch(() => setData({ searches: [] }));

  useEffect(() => {
    if (!loading && !user) router.replace('/auth');
    if (user) load();
  }, [loading, user, router]);

  const openSearch = async (s) => {
    // «دیدم» → شمارنده صفر شود، بعد برو به نتایج
    api(`/saved-searches/${s._id}/seen`, { method: 'POST' }).catch(() => {});
    router.push(searchUrl(s));
  };

  const toggleNotify = async (s) => {
    try {
      await api(`/saved-searches/${s._id}`, { method: 'PATCH', body: { notify: !s.notify } });
      setData((prev) => ({
        ...prev,
        searches: prev.searches.map((x) => (x._id === s._id ? { ...x, notify: !s.notify } : x)),
      }));
      toast.success(!s.notify ? 'اعلان این جستجو فعال شد 🔔' : 'اعلان این جستجو خاموش شد');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const remove = async (s) => {
    const ok = await toast.confirm({
      title: 'حذف جستجوی ذخیره‌شده',
      message: `«${s.label}» حذف شود؟`,
      confirmText: 'حذف شود',
      danger: true,
      icon: '🔖',
    });
    if (!ok) return;
    try {
      await api(`/saved-searches/${s._id}`, { method: 'DELETE' });
      setData((prev) => ({ ...prev, searches: prev.searches.filter((x) => x._id !== s._id) }));
      toast.success('حذف شد');
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading || !user || !data)
    return <p className="py-16 text-center text-gray-400">در حال بارگذاری...</p>;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-5">
        <h1 className="text-xl font-extrabold text-gray-900">🔖 جستجوهای ذخیره‌شده</h1>
        <p className="mt-1 text-sm text-gray-400">
          با انتشار آگهی جدیدِ مطابق هر جستجو، نوتیفیکیشن می‌گیرید
        </p>
      </div>

      {data.searches.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-14 text-center">
          <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-light text-4xl">🔍</span>
          <p className="mt-4 font-bold text-gray-700">هنوز جستجویی ذخیره نکرده‌اید</p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-7 text-gray-400">
            در صفحهٔ اصلی فیلتر کنید (مثلاً «پراید در تهران») و روی «ذخیره جستجو» بزنید
            تا آگهی‌های جدید را از دست ندهید.
          </p>
          <Link href="/" className="mt-4 inline-block rounded-2xl bg-brand px-6 py-3 text-sm font-bold text-white shadow-lg shadow-brand/25">
            شروع جستجو
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {data.searches.map((s) => (
            <div key={s._id} className="fade-up rounded-3xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-3">
                <button onClick={() => openSearch(s)} className="min-w-0 flex-1 text-right">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-[15px] font-bold text-gray-800 hover:text-brand">
                      {s.label}
                    </span>
                    {s.newCount > 0 && (
                      <span className="flex h-5 min-w-5 flex-shrink-0 items-center justify-center rounded-full bg-brand px-1.5 text-[10px] font-bold text-white">
                        {Number(s.newCount).toLocaleString('fa-IR')} جدید
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-xs text-gray-400">
                    ذخیره {timeAgo(s.createdAt)}
                    {s.minPrice != null && ` · از ${Number(s.minPrice).toLocaleString('fa-IR')}`}
                    {s.maxPrice != null && ` تا ${Number(s.maxPrice).toLocaleString('fa-IR')} تومان`}
                  </span>
                </button>

                {/* سوییچ اعلان */}
                <button
                  onClick={() => toggleNotify(s)}
                  role="switch"
                  aria-checked={s.notify}
                  title={s.notify ? 'خاموش کردن اعلان' : 'روشن کردن اعلان'}
                  className={`relative h-7 w-12 flex-shrink-0 rounded-full transition-colors ${s.notify ? 'bg-brand' : 'bg-gray-200'}`}
                >
                  <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-md transition-all ${s.notify ? 'left-1' : 'left-6'}`} />
                </button>

                <button
                  onClick={() => remove(s)}
                  className="flex-shrink-0 rounded-xl p-2 text-gray-300 transition hover:bg-red-50 hover:text-red-500"
                  aria-label="حذف"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
                </button>
              </div>
              <button
                onClick={() => openSearch(s)}
                className="mt-3 w-full rounded-2xl border border-gray-100 bg-gray-50 py-2.5 text-xs font-bold text-gray-600 transition hover:border-brand/30 hover:text-brand"
              >
                مشاهده نتایج ←
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
