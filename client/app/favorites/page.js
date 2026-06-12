'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import AdCard from '../../components/AdCard';

export default function FavoritesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [favs, setFavs] = useState(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/auth');
    if (user) api('/users/favorites').then((d) => setFavs(d.favorites)).catch(() => setFavs([]));
  }, [loading, user, router]);

  if (loading || !user || favs === null)
    return <p className="text-center text-gray-500">در حال بارگذاری...</p>;

  return (
    <div>
      <h1 className="mb-4 text-lg font-extrabold">نشان‌شده‌ها ({Number(favs.length).toLocaleString('fa-IR')})</h1>
      {favs.length === 0 ? (
        <div className="rounded-xl border bg-white p-10 text-center text-gray-500">
          هنوز آگهی‌ای نشان نکرده‌اید. ❤️
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {favs.map((ad) => (
            <AdCard key={ad._id} ad={ad} />
          ))}
        </div>
      )}
    </div>
  );
}
