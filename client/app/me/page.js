'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/AuthContext';
import { usePush } from '../../lib/usePush';
import { api, CITIES } from '../../lib/api';
import { useToast } from '../../components/Toast';
import { SkeletonBox } from '../../components/Skeleton';

/* ---------- آیکون‌های SVG ---------- */
const Icon = {
  ads: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M7 9h10M7 13h6"/></svg>,
  chat: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>,
  heart: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.5-1.5 2.5-3.2 2.5-5A4.5 4.5 0 0 0 17 4.5c-2 0-3.5 1-5 3-1.5-2-3-3-5-3A4.5 4.5 0 0 0 2.5 9c0 1.8 1 3.5 2.5 5l7 7 7-7z"/></svg>,
  plus: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>,
  user: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.5-6 8-6s8 2 8 6"/></svg>,
  bell: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>,
  edit: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>,
  logout: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/></svg>,
  chevron: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>,
};

/* ---------- ردیف منو ---------- */
function MenuItem({ href, icon, title, desc, badge, color = 'text-gray-600 bg-gray-100' }) {
  return (
    <Link href={href} className="group flex items-center gap-4 px-5 py-4 transition hover:bg-gray-50/80">
      <span className={`flex h-11 w-11 items-center justify-center rounded-2xl transition group-hover:scale-105 ${color}`}>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-[15px] font-bold text-gray-800">
          {title}
          {badge > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[10px] font-bold text-white">
              {Number(badge).toLocaleString('fa-IR')}
            </span>
          )}
        </span>
        <span className="block truncate text-[13px] text-gray-400">{desc}</span>
      </span>
      <span className="text-gray-300 transition group-hover:-translate-x-0.5 group-hover:text-brand">{Icon.chevron}</span>
    </Link>
  );
}

/* ---------- سوییچ نوتیفیکیشن ---------- */
function PushToggle({ user }) {
  const { supported, permission, subscribed, loading, enable, disable } = usePush(user);
  const toast = useToast();
  if (!supported) return null;

  const toggle = async () => {
    const wasOn = subscribed; // state بعد از await عوض می‌شود — پیام درست بر اساس حالت قبلی
    const res = wasOn ? await disable() : await enable();
    if (res?.error) toast.error(res.error);
    else toast.success(wasOn ? 'نوتیفیکیشن غیرفعال شد' : 'نوتیفیکیشن فعال شد 🔔');
  };

  return (
    <div className="flex items-center gap-4 px-5 py-4">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-500">{Icon.bell}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-bold text-gray-800">نوتیفیکیشن پیام‌ها</span>
        <span className="block truncate text-[13px] text-gray-400">
          {permission === 'denied' ? 'در تنظیمات مرورگر مسدود شده' : subscribed ? 'فعال است' : 'پیام‌های چت را از دست ندهید'}
        </span>
      </span>
      <button
        onClick={toggle}
        disabled={loading || permission === 'denied'}
        role="switch"
        aria-checked={subscribed}
        className={`relative h-7 w-12 flex-shrink-0 rounded-full transition-colors disabled:opacity-40 ${subscribed ? 'bg-brand' : 'bg-gray-200'}`}
      >
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-md transition-all ${subscribed ? 'left-1' : 'left-6'}`} />
      </button>
    </div>
  );
}

/* ---------- ویرایش پروفایل (شیت پایین) ---------- */
function EditProfileSheet({ user, open, onClose, onSaved }) {
  const toast = useToast();
  const [name, setName] = useState(user?.name || '');
  const [city, setCity] = useState(user?.city || '');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setName(user?.name || '');
      setCity(user?.city || '');
    }
  }, [open, user]);

  if (!open) return null;

  const save = async () => {
    setBusy(true);
    try {
      await api('/users/me', { method: 'PATCH', body: { name: name.trim(), city } });
      await onSaved();
      onClose();
      toast.success('پروفایل به‌روزرسانی شد');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:inset-x-auto md:left-1/2 md:top-1/2 md:bottom-auto md:w-[420px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-3xl md:shadow-2xl">
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-gray-200 md:hidden" />
        <h3 className="mb-5 text-lg font-extrabold text-gray-900">ویرایش پروفایل</h3>

        <label className="mb-1.5 block text-sm font-bold text-gray-700">نام و نام خانوادگی</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          placeholder="مثلاً: امین بزرگانی"
          className="mb-4 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-brand focus:bg-white"
        />

        <label className="mb-1.5 block text-sm font-bold text-gray-700">شهر</label>
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="mb-6 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-brand focus:bg-white"
        >
          {CITIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <div className="flex gap-2">
          <button
            onClick={save}
            disabled={busy}
            className="flex-1 rounded-2xl bg-brand py-3.5 text-sm font-bold text-white shadow-lg shadow-brand/25 transition hover:bg-brand-dark disabled:opacity-50"
          >
            {busy ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
          </button>
          <button onClick={onClose} className="rounded-2xl border border-gray-200 px-6 py-3.5 text-sm text-gray-500 transition hover:border-gray-300">
            انصراف
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- صفحه اصلی ---------- */
export default function MePage() {
  const { user, loading, logout, refresh } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.allSettled([
      api('/ads/mine'),
      api('/users/favorites'),
      api('/chat/unread-count'),
      api(`/users/${user.id}/profile?limit=1`),
      api('/saved-searches/new-count'),
    ]).then(([adsR, favR, chatR, profR, ssR]) => {
      const ads = adsR.status === 'fulfilled' ? adsR.value.ads : [];
      setStats({
        active: ads.filter((a) => a.status === 'active').length,
        sold: ads.filter((a) => a.status === 'sold').length,
        views: ads.reduce((s, a) => s + (a.views || 0), 0),
        favorites: favR.status === 'fulfilled' ? favR.value.favorites.length : 0,
        unread: chatR.status === 'fulfilled' ? chatR.value.total : 0,
        rating: profR.status === 'fulfilled' ? profR.value.rating : { avg: 0, count: 0 },
        searchNew: ssR.status === 'fulfilled' ? ssR.value.total : 0,
      });
    });
  }, [user]);

  if (loading)
    return (
      <div className="mx-auto max-w-md">
        <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white">
          <SkeletonBox className="h-40 rounded-none" />
          <div className="space-y-3 p-6">
            <SkeletonBox className="h-5 w-1/2" />
            <SkeletonBox className="h-4 w-1/3" />
            <div className="grid grid-cols-3 gap-3 pt-2">
              <SkeletonBox className="h-16" />
              <SkeletonBox className="h-16" />
              <SkeletonBox className="h-16" />
            </div>
          </div>
        </div>
      </div>
    );

  /* ---- حالت مهمان ---- */
  if (!user) {
    return (
      <div className="mx-auto max-w-md">
        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white">
          <div className="bg-gradient-to-br from-brand to-brand-dark px-8 pb-16 pt-10 text-center">
            <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-white/15 text-white backdrop-blur">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 3v18M16 3v18M8 7h8M8 12h8M8 17h8"/></svg>
            </span>
            <h1 className="mt-4 text-xl font-black text-white">به نردبان خوش آمدید</h1>
            <p className="mt-2 text-sm leading-7 text-white/80">
              برای ثبت آگهی، چت با فروشندگان و نشان‌کردن آگهی‌ها وارد شوید.
            </p>
          </div>
          <div className="-mt-8 px-6 pb-8">
            <Link
              href="/auth"
              className="block w-full rounded-2xl bg-white py-4 text-center text-sm font-extrabold text-brand shadow-xl ring-1 ring-gray-100 transition hover:shadow-2xl"
            >
              ورود / ثبت‌نام با شماره موبایل
            </Link>
            <div className="mt-6 grid grid-cols-3 gap-3 text-center text-xs text-gray-400">
              <div className="rounded-2xl bg-gray-50 py-4">📋<p className="mt-1">ثبت آگهی</p></div>
              <div className="rounded-2xl bg-gray-50 py-4">💬<p className="mt-1">چت امن</p></div>
              <div className="rounded-2xl bg-gray-50 py-4">❤️<p className="mt-1">نشان‌کردن</p></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ---- حالت لاگین ---- */
  return (
    <div className="mx-auto max-w-md space-y-4">
      {/* هدر گرادیانی پروفایل */}
      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white">
        <div className="relative bg-gradient-to-br from-brand to-brand-dark px-6 pb-14 pt-7">
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-2xl font-black text-white backdrop-blur">
              {(user.name || 'ن').charAt(0)}
            </span>
            <div className="min-w-0 flex-1 text-white">
              <h1 className="truncate text-lg font-extrabold">{user.name || 'کاربر نردبان'}</h1>
              <p className="text-sm text-white/75" dir="ltr">{user.phone}</p>
            </div>
            <button
              onClick={() => setEditOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-2 text-xs font-bold text-white backdrop-blur transition hover:bg-white/25"
            >
              {Icon.edit} ویرایش
            </button>
          </div>
          {stats?.rating?.count > 0 && (
            <Link href={`/users/${user.id}`} className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold text-white backdrop-blur">
              ⭐ {stats.rating.avg.toLocaleString('fa-IR')}
              <span className="font-normal text-white/70">({Number(stats.rating.count).toLocaleString('fa-IR')} نظر)</span>
            </Link>
          )}
        </div>

        {/* کارت آمار شناور */}
        <div className="-mt-9 px-4 pb-5">
          <div className="grid grid-cols-4 divide-x divide-x-reverse divide-gray-100 rounded-2xl bg-white py-4 shadow-lg ring-1 ring-gray-100">
            {[
              { v: stats?.active, l: 'آگهی فعال' },
              { v: stats?.sold, l: 'فروخته' },
              { v: stats?.views, l: 'بازدید' },
              { v: stats?.favorites, l: 'نشان‌شده' },
            ].map((s) => (
              <div key={s.l} className="text-center">
                <p className="text-lg font-black text-gray-800">
                  {s.v === undefined ? '—' : Number(s.v).toLocaleString('fa-IR')}
                </p>
                <p className="mt-0.5 text-[10px] text-gray-400">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* منو */}
      <div className="divide-y divide-gray-50 overflow-hidden rounded-3xl border border-gray-200 bg-white">
        {user.role === 'admin' && (
          <MenuItem href="/admin" icon={<span className="text-lg">👑</span>} title="پنل مدیریت" desc="داشبورد، آگهی‌ها، کاربران و نظرات" color="bg-amber-50 text-amber-600" />
        )}
        <MenuItem href="/my-ads" icon={Icon.ads} title="آگهی‌های من" desc="مدیریت، تغییر وضعیت و چت خریداران" color="bg-blue-50 text-blue-500" />
        <MenuItem href="/chat" icon={Icon.chat} title="چت و تماس" desc="گفتگو با خریداران و فروشندگان" badge={stats?.unread} color="bg-green-50 text-green-600" />
        <MenuItem href="/favorites" icon={Icon.heart} title="نشان‌شده‌ها" desc="آگهی‌هایی که ذخیره کرده‌اید" color="bg-rose-50 text-rose-500" />
        <MenuItem href="/saved-searches" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>} title="جستجوهای ذخیره‌شده" desc="اعلان آگهی‌های جدید مطابق جستجو" badge={stats?.searchNew} color="bg-cyan-50 text-cyan-600" />
        <MenuItem href={`/users/${user.id}`} icon={Icon.user} title="پروفایل عمومی من" desc="آنچه دیگران از شما می‌بینند" color="bg-violet-50 text-violet-500" />
        <MenuItem href="/new" icon={Icon.plus} title="ثبت آگهی جدید" desc="در ۵ مرحلهٔ ساده" color="bg-brand-light text-brand" />
      </div>

      {/* تنظیمات */}
      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white">
        <PushToggle user={user} />
      </div>

      {/* خروج */}
      <button
        onClick={() => { logout(); router.push('/'); }}
        className="flex w-full items-center justify-center gap-2 rounded-3xl border border-red-100 bg-white py-4 text-sm font-bold text-red-500 transition hover:bg-red-50"
      >
        {Icon.logout} خروج از حساب
      </button>

      <div className="flex items-center justify-center gap-4 pb-2 text-[11px] text-gray-400">
        <Link href="/about" className="hover:text-brand">دربارهٔ نردبان</Link>
        <span className="text-gray-200">|</span>
        <Link href="/terms" className="hover:text-brand">قوانین</Link>
        <span className="text-gray-200">|</span>
        <Link href="/support" className="hover:text-brand">پشتیبانی</Link>
      </div>
      <p className="pb-2 text-center text-[11px] text-gray-300">نردبان · نسخه ۱.۰</p>

      <EditProfileSheet
        user={user}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={refresh}
      />
    </div>
  );
}
