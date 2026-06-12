'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, formatPrice, timeAgo, imgUrl } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { useToast } from '../../components/Toast';

/* ================== اجزای کوچک ================== */

function StatCard({ label, value, sub, color = 'from-gray-700 to-gray-900', icon }) {
  return (
    <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${color} p-5 text-white`}>
      <span className="absolute -left-3 -top-3 text-6xl opacity-15">{icon}</span>
      <p className="text-2xl font-black">
        {value === undefined ? '—' : Number(value).toLocaleString('fa-IR')}
      </p>
      <p className="mt-1 text-xs text-white/80">{label}</p>
      {sub && <p className="mt-0.5 text-[10px] text-white/60">{sub}</p>}
    </div>
  );
}

// نمودار میله‌ای ساده SVG (بدون کتابخانه)
function BarChart({ data, title, color = '#a62626' }) {
  const days = [...Array(14)].map((_, i) => {
    const d = new Date(Date.now() - (13 - i) * 24 * 3600 * 1000);
    const key = d.toISOString().slice(0, 10);
    return { key, label: d.toLocaleDateString('fa-IR', { day: 'numeric' }), count: 0 };
  });
  const map = Object.fromEntries((data || []).map((d) => [d._id, d.count]));
  days.forEach((d) => (d.count = map[d.key] || 0));
  const max = Math.max(1, ...days.map((d) => d.count));

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-5">
      <h3 className="mb-4 text-sm font-extrabold text-gray-800">{title}</h3>
      <div className="flex h-32 items-end gap-1.5">
        {days.map((d) => (
          <div key={d.key} className="group relative flex flex-1 flex-col items-center gap-1">
            <span className="pointer-events-none absolute -top-6 rounded-md bg-gray-900 px-1.5 py-0.5 text-[9px] text-white opacity-0 transition group-hover:opacity-100">
              {d.count.toLocaleString('fa-IR')}
            </span>
            <div
              className="w-full rounded-t-md transition-all group-hover:opacity-80"
              style={{ height: `${Math.max(3, (d.count / max) * 100)}%`, background: d.count ? color : '#f3f4f6' }}
            />
            <span className="text-[8px] text-gray-400">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const STATUS_FA = { pending: '🟠 در انتظار', active: '🟢 فعال', reserved: '🟡 رزرو', sold: '🔵 فروخته', hidden: '⚪ مخفی', rejected: '🔴 رد شده' };

/* ================== تب داشبورد ================== */
function DashboardTab() {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    api('/admin/stats').then(setStats).catch(() => {});
  }, []);

  if (!stats) return <p className="py-10 text-center text-gray-400">در حال بارگذاری آمار...</p>;
  const { counts, adsByDay, usersByDay, topCities } = stats;
  const maxCity = Math.max(1, ...(topCities || []).map((c) => c.count));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="کل آگهی‌ها" value={counts.totalAds} sub={`${Number(counts.activeAds).toLocaleString('fa-IR')} فعال · ${Number(counts.pendingAds || 0).toLocaleString('fa-IR')} در انتظار`} color="from-brand to-brand-dark" icon="📋" />
        <StatCard label="کاربران" value={counts.totalUsers} sub={`${Number(counts.blockedUsers).toLocaleString('fa-IR')} مسدود`} color="from-blue-500 to-blue-700" icon="👥" />
        <StatCard label="گفتگوها" value={counts.totalConvs} sub={`${Number(counts.totalMsgs).toLocaleString('fa-IR')} پیام`} color="from-emerald-500 to-emerald-700" icon="💬" />
        <StatCard label="نظرات" value={counts.totalReviews} sub={`${Number(counts.soldAds).toLocaleString('fa-IR')} فروش موفق`} color="from-amber-500 to-orange-600" icon="⭐" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <BarChart data={adsByDay} title="آگهی‌های جدید — ۱۴ روز اخیر" color="#a62626" />
        <BarChart data={usersByDay} title="ثبت‌نام کاربران — ۱۴ روز اخیر" color="#3b82f6" />
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white p-5">
        <h3 className="mb-4 text-sm font-extrabold text-gray-800">شهرهای پرآگهی</h3>
        <div className="space-y-2.5">
          {(topCities || []).map((c) => (
            <div key={c._id} className="flex items-center gap-3 text-sm">
              <span className="w-16 font-bold text-gray-700">{c._id}</span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-gradient-to-l from-brand to-brand/60" style={{ width: `${(c.count / maxCity) * 100}%` }} />
              </div>
              <span className="w-8 text-left text-xs text-gray-400">{Number(c.count).toLocaleString('fa-IR')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ================== تب آگهی‌ها ================== */
function AdsTab({ initialStatus = '' }) {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState(initialStatus);
  const [page, setPage] = useState(1);

  const load = useCallback(() => {
    const sp = new URLSearchParams({ page: String(page) });
    if (q.trim()) sp.set('q', q.trim());
    if (status) sp.set('status', status);
    api(`/admin/ads?${sp}`).then(setData).catch(() => {});
  }, [q, status, page]);

  useEffect(() => {
    const t = setTimeout(load, 350);
    return () => clearTimeout(t);
  }, [load]);

  const setAdStatus = async (id, s) => {
    try {
      await api(`/admin/ads/${id}`, { method: 'PATCH', body: { status: s } });
      toast.success('وضعیت تغییر کرد');
      load();
    } catch (err) { toast.error(err.message); }
  };
  const approveAd = async (id) => {
    try {
      await api(`/admin/ads/${id}/approve`, { method: 'POST' });
      toast.success('آگهی تایید و منتشر شد ✅');
      load();
    } catch (err) { toast.error(err.message); }
  };
  const [rejecting, setRejecting] = useState(null); // {id, title}
  const [rejectReason, setRejectReason] = useState('');
  const doReject = async () => {
    if (!rejectReason.trim()) return toast.warning('دلیل رد را بنویسید');
    try {
      await api(`/admin/ads/${rejecting.id}/reject`, { method: 'POST', body: { reason: rejectReason.trim() } });
      toast.success('آگهی رد شد و دلیل برای کاربر ارسال شد');
      setRejecting(null);
      setRejectReason('');
      load();
    } catch (err) { toast.error(err.message); }
  };
  const removeAd = async (id) => {
    const ok = await toast.confirm({
      title: 'حذف کامل آگهی',
      message: 'آگهی به همراه همهٔ گفتگوها و پیام‌هایش حذف می‌شود.',
      confirmText: 'حذف شود',
      danger: true,
    });
    if (!ok) return;
    try {
      await api(`/admin/ads/${id}`, { method: 'DELETE' });
      toast.success('آگهی حذف شد');
      load();
    } catch (err) { toast.error(err.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
          placeholder="جستجوی عنوان..."
          className="flex-1 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-brand"
        />
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="rounded-2xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"
        >
          <option value="">همه وضعیت‌ها</option>
          <option value="pending">🟠 در انتظار تایید</option>
          <option value="active">🟢 فعال</option>
          <option value="reserved">🟡 رزرو</option>
          <option value="sold">🔵 فروخته</option>
          <option value="hidden">⚪ مخفی</option>
          <option value="rejected">🔴 رد شده</option>
        </select>
      </div>

      {!data ? (
        <p className="py-10 text-center text-gray-400">در حال بارگذاری...</p>
      ) : (
        <>
          <p className="text-xs text-gray-400">{Number(data.total).toLocaleString('fa-IR')} آگهی</p>
          <div className="space-y-2.5">
            {data.ads.map((ad) => (
              <div key={ad._id} className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3">
                <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-gray-100">
                  {ad.images?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imgUrl(ad.images[0])} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-xl opacity-60">{ad.category?.icon || '📦'}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <Link href={`/ads/${ad._id}`} className="line-clamp-1 text-sm font-bold text-gray-800 hover:text-brand">
                    {ad.title}
                  </Link>
                  <p className="mt-0.5 text-[11px] text-gray-400">
                    {formatPrice(ad)} · {ad.city} · {timeAgo(ad.createdAt)} · 👁 {Number(ad.views || 0).toLocaleString('fa-IR')}
                  </p>
                  <p className="text-[11px] text-gray-400" dir="ltr">
                    {ad.owner?.phone} {ad.owner?.isBlocked && '🚫'}
                  </p>
                </div>
                {ad.status === 'pending' ? (
                  <div className="flex flex-shrink-0 flex-col gap-1.5 sm:flex-row">
                    <button onClick={() => approveAd(ad._id)} className="rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-emerald-600">
                      ✓ تایید
                    </button>
                    <button onClick={() => { setRejecting({ id: ad._id, title: ad.title }); setRejectReason(''); }} className="rounded-xl bg-red-50 px-3.5 py-2 text-xs font-bold text-red-500 transition hover:bg-red-100">
                      ✕ رد
                    </button>
                  </div>
                ) : (
                  <select
                    value={ad.status}
                    onChange={(e) => setAdStatus(ad._id, e.target.value)}
                    className="rounded-xl border border-gray-200 bg-white px-2 py-1.5 text-xs outline-none"
                  >
                    {Object.entries(STATUS_FA).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                )}
                <button onClick={() => removeAd(ad._id)} className="rounded-xl px-2.5 py-1.5 text-xs text-red-400 transition hover:bg-red-50 hover:text-red-600">
                  حذف
                </button>
              </div>
            ))}
          </div>
          {data.pages > 1 && (
            <Pager page={page} pages={data.pages} onPage={setPage} />
          )}
        </>
      )}

      {/* مودال دلیل رد */}
      {rejecting && (
        <div className="fixed inset-0 z-[85] flex items-end justify-center p-4 sm:items-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={() => setRejecting(null)} />
          <div className="dialog-in relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-extrabold text-gray-900">رد آگهی</h3>
            <p className="mt-1 line-clamp-1 text-sm text-gray-400">{rejecting.title}</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              maxLength={500}
              autoFocus
              placeholder="دلیل رد را بنویسید... (برای کاربر نمایش داده می‌شود — مثلاً: عکس نامناسب، قیمت غیرواقعی، اطلاعات ناقص)"
              className="mt-4 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm leading-7 outline-none transition focus:border-red-400 focus:bg-white"
            />
            <div className="mt-4 flex gap-2">
              <button onClick={doReject} className="flex-1 rounded-2xl bg-red-500 py-3 text-sm font-extrabold text-white shadow-lg shadow-red-500/25 transition hover:bg-red-600">
                رد آگهی و ارسال دلیل
              </button>
              <button onClick={() => setRejecting(null)} className="rounded-2xl border border-gray-200 px-5 py-3 text-sm text-gray-500">
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================== تب کاربران ================== */
function UsersTab() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [q, setQ] = useState('');
  const [onlyBlocked, setOnlyBlocked] = useState(false);
  const [page, setPage] = useState(1);

  const load = useCallback(() => {
    const sp = new URLSearchParams({ page: String(page) });
    if (q.trim()) sp.set('q', q.trim());
    if (onlyBlocked) sp.set('blocked', 'true');
    api(`/admin/users?${sp}`).then(setData).catch(() => {});
  }, [q, onlyBlocked, page]);

  useEffect(() => {
    const t = setTimeout(load, 350);
    return () => clearTimeout(t);
  }, [load]);

  const toggleBlock = async (u) => {
    const ok = await toast.confirm({
      title: u.isBlocked ? 'رفع مسدودی کاربر' : 'مسدودسازی کاربر',
      message: u.isBlocked
        ? `«${u.name || u.phone}» دوباره به حساب خود دسترسی پیدا می‌کند.`
        : `«${u.name || u.phone}» مسدود و همهٔ آگهی‌هایش مخفی می‌شوند.`,
      confirmText: u.isBlocked ? 'رفع مسدودی' : 'مسدود شود',
      danger: !u.isBlocked,
      icon: u.isBlocked ? '🔓' : '🚫',
    });
    if (!ok) return;
    try {
      await api(`/admin/users/${u._id}/block`, { method: 'PATCH' });
      toast.success(u.isBlocked ? 'کاربر رفع مسدودی شد' : 'کاربر مسدود شد');
      load();
    } catch (err) { toast.error(err.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
          placeholder="جستجوی نام یا شماره..."
          className="flex-1 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-brand"
        />
        <label className="flex cursor-pointer items-center gap-1.5 rounded-2xl border border-gray-200 bg-white px-3 py-2.5 text-xs">
          <input type="checkbox" checked={onlyBlocked} onChange={(e) => { setOnlyBlocked(e.target.checked); setPage(1); }} />
          فقط مسدودها
        </label>
      </div>

      {!data ? (
        <p className="py-10 text-center text-gray-400">در حال بارگذاری...</p>
      ) : (
        <>
          <p className="text-xs text-gray-400">{Number(data.total).toLocaleString('fa-IR')} کاربر</p>
          <div className="space-y-2.5">
            {data.users.map((u) => (
              <div key={u._id} className={`flex items-center gap-3 rounded-2xl border bg-white p-3 ${u.isBlocked ? 'border-red-200 bg-red-50/40' : 'border-gray-200'}`}>
                <span className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-sm font-black ${u.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                  {u.role === 'admin' ? '👑' : (u.name || 'ن').charAt(0)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-bold text-gray-800">
                    <Link href={`/users/${u._id}`} className="hover:text-brand">{u.name || 'بدون نام'}</Link>
                    {u.isBlocked && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[9px] font-bold text-red-600">مسدود</span>}
                    {u.role === 'admin' && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-700">مدیر</span>}
                  </p>
                  <p className="text-[11px] text-gray-400">
                    <span dir="ltr">{u.phone}</span> · {u.city} · {Number(u.adCount).toLocaleString('fa-IR')} آگهی · عضویت {timeAgo(u.createdAt)}
                  </p>
                </div>
                {u.role !== 'admin' && (
                  <button
                    onClick={() => toggleBlock(u)}
                    className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                      u.isBlocked
                        ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                        : 'bg-red-50 text-red-500 hover:bg-red-100'
                    }`}
                  >
                    {u.isBlocked ? 'رفع مسدودی' : 'مسدود کردن'}
                  </button>
                )}
              </div>
            ))}
          </div>
          {data.pages > 1 && <Pager page={page} pages={data.pages} onPage={setPage} />}
        </>
      )}
    </div>
  );
}

/* ================== تب نظرات ================== */
function ReviewsTab() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);

  const load = useCallback(() => {
    api(`/admin/reviews?page=${page}`).then(setData).catch(() => {});
  }, [page]);
  useEffect(load, [load]);

  const remove = async (id) => {
    const ok = await toast.confirm({ title: 'حذف نظر', message: 'این نظر برای همیشه حذف می‌شود.', confirmText: 'حذف شود', danger: true });
    if (!ok) return;
    try {
      await api(`/admin/reviews/${id}`, { method: 'DELETE' });
      toast.success('نظر حذف شد');
      load();
    } catch (err) { toast.error(err.message); }
  };

  if (!data) return <p className="py-10 text-center text-gray-400">در حال بارگذاری...</p>;

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-400">{Number(data.total).toLocaleString('fa-IR')} نظر</p>
      <div className="space-y-2.5">
        {data.reviews.map((r) => (
          <div key={r._id} className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm">
                <b>{r.rater?.name || 'ناشناس'}</b>
                <span className="text-gray-400"> به </span>
                <b>{r.seller?.name || 'ناشناس'}</b>
                <span className="mr-2 text-amber-500" dir="ltr">{'★'.repeat(r.rating)}</span>
              </p>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-300">{timeAgo(r.createdAt)}</span>
                <button onClick={() => remove(r._id)} className="rounded-lg px-2 py-1 text-xs text-red-400 hover:bg-red-50">
                  حذف
                </button>
              </div>
            </div>
            {r.comment && <p className="mt-1.5 text-sm leading-6 text-gray-600">{r.comment}</p>}
          </div>
        ))}
      </div>
      {data.pages > 1 && <Pager page={page} pages={data.pages} onPage={setPage} />}
    </div>
  );
}

function Pager({ page, pages, onPage }) {
  return (
    <div className="flex items-center justify-center gap-2 text-sm">
      <button disabled={page <= 1} onClick={() => onPage(page - 1)} className="rounded-xl border border-gray-200 bg-white px-4 py-2 disabled:opacity-30">
        قبلی
      </button>
      <span className="px-2 text-xs text-gray-400">
        {Number(page).toLocaleString('fa-IR')} / {Number(pages).toLocaleString('fa-IR')}
      </span>
      <button disabled={page >= pages} onClick={() => onPage(page + 1)} className="rounded-xl border border-gray-200 bg-white px-4 py-2 disabled:opacity-30">
        بعدی
      </button>
    </div>
  );
}

/* ================== صفحه اصلی پنل ================== */
const TABS = [
  { id: 'dashboard', label: '📊 داشبورد' },
  { id: 'pending', label: '🟠 در انتظار تایید' },
  { id: 'ads', label: '📋 آگهی‌ها' },
  { id: 'users', label: '👥 کاربران' },
  { id: 'reviews', label: '⭐ نظرات' },
];

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState('dashboard');
  const [pendingCount, setPendingCount] = useState(0);

  // شمارنده در انتظار تایید (هر ۳۰ ثانیه)
  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    const load = () =>
      api('/admin/ads?status=pending&limit=1').then((d) => setPendingCount(d.total)).catch(() => {});
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [user]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) router.replace('/');
  }, [loading, user, router]);

  if (loading || !user || user.role !== 'admin')
    return <p className="py-16 text-center text-gray-400">در حال بررسی دسترسی...</p>;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">👑 پنل مدیریت نردبان</h1>
          <p className="mt-0.5 text-sm text-gray-400">خوش آمدید، {user.name}</p>
        </div>
        {/* دسترسی سریع شخصی */}
        <div className="flex gap-2 text-xs">
          <Link href="/new" className="rounded-xl bg-brand px-3.5 py-2 font-bold text-white transition hover:bg-brand-dark">+ ثبت آگهی</Link>
          <Link href="/my-ads" className="rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-gray-600 transition hover:border-gray-300">آگهی‌های من</Link>
          <Link href="/favorites" className="rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-gray-600 transition hover:border-gray-300">❤️ نشان‌ها</Link>
        </div>
      </div>

      {/* تب‌ها */}
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`relative flex-shrink-0 rounded-2xl px-5 py-2.5 text-sm font-bold transition ${
              tab === t.id ? 'bg-gray-900 text-white shadow-md' : 'border border-gray-200 bg-white text-gray-500 hover:border-gray-300'
            }`}
          >
            {t.label}
            {t.id === 'pending' && pendingCount > 0 && (
              <span className="absolute -left-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[10px] font-bold text-white shadow">
                {Number(pendingCount).toLocaleString('fa-IR')}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && <DashboardTab />}
      {tab === 'pending' && <AdsTab key="pending" initialStatus="pending" />}
      {tab === 'ads' && <AdsTab key="all" />}
      {tab === 'users' && <UsersTab />}
      {tab === 'reviews' && <ReviewsTab />}
    </div>
  );
}
