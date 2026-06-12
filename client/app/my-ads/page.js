'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, formatPrice, timeAgo } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import AdChats from './AdChats';

const STATUS_FA = { active: '🟢 فعال', reserved: '🟡 رزرو شده', sold: '🔵 فروخته شد', hidden: '⚪ مخفی' };

export default function MyAdsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [ads, setAds] = useState(null);

  const [chatMap, setChatMap] = useState({}); // adId -> unread count

  useEffect(() => {
    if (!loading && !user) router.replace('/auth');
    if (user) {
      api('/ads/mine').then((d) => setAds(d.ads)).catch(() => setAds([]));
      // تعداد نخوانده به تفکیک آگهی (از لیست کل گفتگوها)
      api('/chat/conversations')
        .then((d) => {
          const map = {};
          d.conversations
            .filter((c) => c.role === 'seller')
            .forEach((c) => {
              const id = c.ad?._id;
              if (id) map[id] = (map[id] || 0) + (c.unread || 0);
            });
          setChatMap(map);
        })
        .catch(() => {});
    }
  }, [loading, user, router]);

  const setStatus = async (id, status) => {
    await api(`/ads/${id}`, { method: 'PATCH', body: { status } });
    setAds((prev) => prev.map((a) => (a._id === id ? { ...a, status } : a)));
  };

  const remove = async (id) => {
    if (!confirm('این آگهی حذف شود؟')) return;
    await api(`/ads/${id}`, { method: 'DELETE' });
    setAds((prev) => prev.filter((a) => a._id !== id));
  };

  if (loading || !user || ads === null)
    return <p className="text-center text-gray-500">در حال بارگذاری...</p>;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-4 text-lg font-extrabold">آگهی‌های من ({Number(ads.length).toLocaleString('fa-IR')})</h1>

      {ads.length === 0 ? (
        <div className="rounded-xl border bg-white p-10 text-center text-gray-500">
          هنوز آگهی ثبت نکرده‌اید.{' '}
          <Link href="/new" className="text-brand underline">ثبت اولین آگهی</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {ads.map((ad) => (
            <div key={ad._id} className="rounded-xl border bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link href={`/ads/${ad._id}`} className="font-bold hover:text-brand">
                    {ad.title}
                  </Link>
                  <p className="mt-1 text-xs text-gray-500">
                    {formatPrice(ad)} · {timeAgo(ad.createdAt)} · 👁 {Number(ad.views || 0).toLocaleString('fa-IR')}
                  </p>
                </div>
                <span className="whitespace-nowrap text-xs">{STATUS_FA[ad.status]}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <select
                  value={ad.status}
                  onChange={(e) => setStatus(ad._id, e.target.value)}
                  className="rounded-lg border bg-white px-2 py-1"
                >
                  <option value="active">فعال</option>
                  <option value="reserved">رزرو شده</option>
                  <option value="sold">فروخته شد</option>
                  <option value="hidden">مخفی</option>
                </select>
                <button onClick={() => remove(ad._id)} className="rounded-lg border border-red-200 px-3 py-1 text-red-600 hover:bg-red-50">
                  حذف
                </button>
              </div>
              <AdChats adId={ad._id} totalUnread={chatMap[ad._id] || 0} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
