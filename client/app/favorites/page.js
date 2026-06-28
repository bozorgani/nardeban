'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import AdCard from '../../components/AdCard';
import { useToast } from '../../components/Toast';
import { AdGridSkeleton, HeaderSkeleton } from '../../components/Skeleton';

export default function FavoritesPage() {
  const { user, loading, refresh } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [favs, setFavs] = useState(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/auth?next=/favorites');
    if (user) api('/users/favorites').then((d) => setFavs(d.favorites)).catch(() => setFavs([]));
  }, [loading, user, router]);

  const removeAll = async () => {
    const ok = await toast.confirm({
      title: 'حذف همهٔ نشان‌ها',
      message: 'تمام آگهی‌های ذخیره‌شده از فهرست نشان‌ها حذف می‌شوند.',
      confirmText: 'حذف همه',
      danger: true,
      icon: '💔',
    });
    if (!ok) return;
    await Promise.allSettled(favs.map((f) => api(`/users/favorites/${f._id}`, { method: 'POST' })));
    setFavs([]);
    refresh();
    toast.success('همهٔ نشان‌ها حذف شدند');
  };

  if (loading || !user || favs === null)
    return (
      <div className="mx-auto max-w-5xl">
        <HeaderSkeleton />
        <AdGridSkeleton count={6} />
      </div>
    );

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">❤️ نشان‌شده‌ها</h1>
          <p className="mt-0.5 text-sm text-gray-400">
            {Number(favs.length).toLocaleString('fa-IR')} آگهی ذخیره شده
          </p>
        </div>
        {favs.length > 0 && (
          <button
            onClick={removeAll}
            className="rounded-xl px-3 py-2 text-xs text-red-400 transition hover:bg-red-50 hover:text-red-600"
          >
            حذف همه
          </button>
        )}
      </div>

      {favs.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-14 text-center">
          <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-rose-50 text-4xl">🤍</span>
          <p className="mt-4 font-bold text-gray-700">هنوز چیزی نشان نکرده‌اید</p>
          <p className="mt-1 text-sm leading-7 text-gray-400">
            با زدن دکمهٔ «نشان کردن» در هر آگهی، آن را اینجا ذخیره کنید.
          </p>
          <Link href="/" className="mt-4 inline-block rounded-2xl bg-brand px-6 py-3 text-sm font-bold text-white shadow-lg shadow-brand/25">
            مرور آگهی‌ها
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {favs.map((ad) => (
            <AdCard key={ad._id} ad={ad} />
          ))}
        </div>
      )}
    </div>
  );
}
