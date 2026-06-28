'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, formatPrice, timeAgo, thumbUrl } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { useToast } from '../../components/Toast';
import AdChats from './AdChats';
import { ListRowSkeleton, HeaderSkeleton } from '../../components/Skeleton';

const STATUS = {
  pending: { label: 'در انتظار تایید', dot: 'bg-orange-400', chip: 'bg-orange-50 text-orange-600' },
  active: { label: 'فعال', dot: 'bg-green-500', chip: 'bg-green-50 text-green-700' },
  reserved: { label: 'رزرو شده', dot: 'bg-amber-400', chip: 'bg-amber-50 text-amber-700' },
  sold: { label: 'فروخته شد', dot: 'bg-blue-500', chip: 'bg-blue-50 text-blue-700' },
  hidden: { label: 'مخفی', dot: 'bg-gray-300', chip: 'bg-gray-100 text-gray-500' },
  rejected: { label: 'رد شده', dot: 'bg-red-500', chip: 'bg-red-50 text-red-600' },
};

const TABS = [
  { id: 'all', label: 'همه' },
  { id: 'pending', label: 'در انتظار' },
  { id: 'active', label: 'فعال' },
  { id: 'rejected', label: 'رد شده' },
  { id: 'sold', label: 'فروخته' },
  { id: 'hidden', label: 'مخفی' },
];

export default function MyAdsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [ads, setAds] = useState(null);
  const [chatMap, setChatMap] = useState({});
  const [tab, setTab] = useState('all');

  useEffect(() => {
    if (!loading && !user) router.replace('/auth?next=/my-ads');
    if (user) {
      api('/ads/mine').then((d) => setAds(d.ads)).catch(() => setAds([]));
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
    try {
      await api(`/ads/${id}`, { method: 'PATCH', body: { status } });
      setAds((prev) => prev.map((a) => (a._id === id ? { ...a, status } : a)));
      toast.success('وضعیت آگهی به‌روزرسانی شد');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const remove = async (id) => {
    const ok = await toast.confirm({
      title: 'حذف آگهی',
      message: 'این آگهی برای همیشه حذف می‌شود و قابل بازگشت نیست.',
      confirmText: 'حذف شود',
      danger: true,
    });
    if (!ok) return;
    try {
      await api(`/ads/${id}`, { method: 'DELETE' });
      setAds((prev) => prev.filter((a) => a._id !== id));
      toast.success('آگهی حذف شد');
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading || !user || ads === null)
    return (
      <div className="mx-auto max-w-3xl">
        <HeaderSkeleton />
        <ListRowSkeleton count={4} />
      </div>
    );

  const filtered = tab === 'all' ? ads : ads.filter((a) => a.status === tab);
  const countOf = (t) => (t === 'all' ? ads.length : ads.filter((a) => a.status === t).length);

  return (
    <div className="mx-auto max-w-3xl">
      {/* هدر */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">آگهی‌های من</h1>
          <p className="mt-0.5 text-sm text-gray-400">
            {Number(ads.length).toLocaleString('fa-IR')} آگهی ·{' '}
            {Number(ads.reduce((s, a) => s + (a.views || 0), 0)).toLocaleString('fa-IR')} بازدید کل
          </p>
        </div>
        <Link
          href="/new"
          className="rounded-2xl bg-brand px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand/25 transition hover:bg-brand-dark"
        >
          + آگهی جدید
        </Link>
      </div>

      {/* تب‌های فیلتر وضعیت */}
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-shrink-0 rounded-full px-4 py-2 text-xs font-bold transition ${
              tab === t.id
                ? 'bg-gray-900 text-white'
                : 'border border-gray-200 bg-white text-gray-500 hover:border-gray-300'
            }`}
          >
            {t.label}
            <span className={`mr-1.5 ${tab === t.id ? 'text-white/60' : 'text-gray-300'}`}>
              {Number(countOf(t.id)).toLocaleString('fa-IR')}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-14 text-center">
          <p className="mb-3 text-5xl">📭</p>
          <p className="font-bold text-gray-700">
            {tab === 'all' ? 'هنوز آگهی ثبت نکرده‌اید' : 'آگهی‌ای با این وضعیت ندارید'}
          </p>
          {tab === 'all' && (
            <Link href="/new" className="mt-3 inline-block rounded-2xl bg-brand px-6 py-3 text-sm font-bold text-white">
              ثبت اولین آگهی
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((ad) => {
            const st = STATUS[ad.status] || STATUS.active;
            const img = ad.images?.[0] ? thumbUrl(ad.images[0]) : null;
            return (
              <div key={ad._id} className="fade-up overflow-hidden rounded-3xl border border-gray-200 bg-white transition hover:shadow-md">
                <div className="flex gap-4 p-4">
                  {/* عکس */}
                  <Link href={`/ads/${ad._id}`} className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-2xl bg-gray-100">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-3xl opacity-60">
                        {ad.category?.icon || '📦'}
                      </span>
                    )}
                  </Link>

                  {/* اطلاعات */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/ads/${ad._id}`} className="line-clamp-1 text-[15px] font-bold text-gray-800 hover:text-brand">
                        {ad.title}
                      </Link>
                      <span className={`flex flex-shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${st.chip}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                        {st.label}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-extrabold text-gray-900">{formatPrice(ad)}</p>
                    <p className="mt-1 flex items-center gap-3 text-[11px] text-gray-400">
                      <span>{timeAgo(ad.createdAt)}</span>
                      <span>👁 {Number(ad.views || 0).toLocaleString('fa-IR')}</span>
                      {ad.city && <span>📍 {ad.city}</span>}
                    </p>
                  </div>
                </div>

                {/* پیام وضعیت بررسی */}
                {ad.status === 'pending' && (
                  <div className="mx-4 mb-1 flex items-center gap-2 rounded-2xl bg-orange-50 px-4 py-3 text-xs leading-6 text-orange-700">
                    <span className="text-base">⏳</span>
                    آگهی شما در صف بررسی است و پس از تایید مدیر منتشر می‌شود.
                  </div>
                )}
                {ad.status === 'rejected' && (
                  <div className="mx-4 mb-1 rounded-2xl bg-red-50 px-4 py-3 text-xs leading-6 text-red-700">
                    <p className="flex items-center gap-2 font-bold">
                      <span className="text-base">🚫</span> آگهی رد شد — دلیل:
                    </p>
                    <p className="mt-1 pr-6">{ad.rejectReason || 'نامشخص'}</p>
                    <p className="mt-1.5 pr-6 text-[11px] text-red-400">
                      پس از ویرایش و اصلاح، آگهی دوباره برای بررسی ارسال می‌شود.
                    </p>
                  </div>
                )}

                {/* اکشن‌ها */}
                <div className="flex flex-wrap items-center gap-2 border-t border-gray-50 bg-gray-50/50 px-4 py-3">
                  {['pending', 'rejected'].includes(ad.status) ? (
                    <span className="w-full text-[11px] text-gray-400 sm:w-auto">
                      {ad.status === 'pending' ? 'در حال بررسی توسط مدیر...' : 'برای انتشار مجدد، ویرایش کنید'}
                    </span>
                  ) : (
                  <select
                    value={ad.status}
                    onChange={(e) => setStatus(ad._id, e.target.value)}
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs outline-none transition focus:border-brand"
                  >
                    <option value="active">🟢 فعال</option>
                    <option value="reserved">🟡 رزرو شده</option>
                    <option value="sold">🔵 فروخته شد</option>
                    <option value="hidden">⚪ مخفی</option>
                  </select>
                  )}
                  <Link
                    href={`/my-ads/edit/${ad._id}`}
                    className="flex-1 rounded-xl bg-gray-900 px-4 py-2 text-center text-xs font-bold text-white transition hover:bg-gray-700 sm:flex-none"
                  >
                    ✏️ ویرایش
                  </Link>
                  <Link
                    href={`/ads/${ad._id}`}
                    className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2 text-center text-xs text-gray-600 transition hover:border-gray-300 sm:flex-none"
                  >
                    مشاهده
                  </Link>
                  <button
                    onClick={() => remove(ad._id)}
                    className="rounded-xl px-3 py-2 text-xs text-red-400 transition hover:bg-red-50 hover:text-red-600"
                  >
                    حذف
                  </button>
                </div>

                {/* چت خریداران */}
                <div className="px-4 pb-4">
                  <AdChats adId={ad._id} totalUnread={chatMap[ad._id] || 0} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
