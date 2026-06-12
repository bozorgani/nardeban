'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/AuthContext';
import { usePush } from '../../lib/usePush';

function PushToggle({ user }) {
  const { supported, permission, subscribed, loading, enable, disable } = usePush(user);

  if (!supported) return null;

  const toggle = async () => {
    const res = subscribed ? await disable() : await enable();
    if (res?.error) alert(res.error);
  };

  return (
    <div className="flex items-center gap-4 px-5 py-4">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-xl">🔔</span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-bold text-gray-800">نوتیفیکیشن پیام‌ها</span>
        <span className="block truncate text-sm text-gray-400">
          {permission === 'denied'
            ? 'در تنظیمات مرورگر مسدود شده است'
            : subscribed
              ? 'فعال — پیام جدید چت اطلاع داده می‌شود'
              : 'با فعال‌سازی، پیام‌های چت را از دست نمی‌دهید'}
        </span>
      </span>
      <button
        onClick={toggle}
        disabled={loading || permission === 'denied'}
        role="switch"
        aria-checked={subscribed}
        className={`relative h-7 w-12 flex-shrink-0 rounded-full transition disabled:opacity-40 ${
          subscribed ? 'bg-brand' : 'bg-gray-300'
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
            subscribed ? 'left-1' : 'left-6'
          }`}
        />
      </button>
    </div>
  );
}

const Item = ({ href, icon, title, desc }) => (
  <Link
    href={href}
    className="flex items-center gap-4 px-5 py-4 transition hover:bg-gray-50"
  >
    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-xl">{icon}</span>
    <span className="min-w-0 flex-1">
      <span className="block text-base font-bold text-gray-800">{title}</span>
      <span className="block truncate text-sm text-gray-400">{desc}</span>
    </span>
    <span className="text-gray-300">◀</span>
  </Link>
);

export default function MePage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  if (loading) return <p className="py-16 text-center text-gray-400">در حال بارگذاری...</p>;

  if (!user) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center">
        <span className="text-5xl">👤</span>
        <h1 className="mt-3 text-lg font-extrabold">نردبان من</h1>
        <p className="mt-2 text-sm leading-7 text-gray-400">
          برای ثبت آگهی، چت و نشان‌کردن آگهی‌ها وارد حساب خود شوید.
        </p>
        <Link
          href="/auth"
          className="mt-5 block w-full rounded-xl bg-brand py-3 text-sm font-bold text-white transition hover:bg-brand-dark"
        >
          ورود / ثبت‌نام
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      {/* کارت پروفایل */}
      <div className="mb-4 flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-light text-xl font-black text-brand">
          {(user.name || 'ن').charAt(0)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-base font-extrabold text-gray-900">{user.name || 'کاربر نردبان'}</p>
          <p className="text-sm text-gray-400" dir="ltr">{user.phone}</p>
        </div>
      </div>

      {/* منو */}
      <div className="divide-y divide-gray-50 overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <Item href="/my-ads" icon="📋" title="آگهی‌های من" desc="مدیریت، تغییر وضعیت و چت خریداران" />
        <Item href="/chat" icon="💬" title="چت و تماس" desc="گفتگو با خریداران و فروشندگان" />
        <Item href="/favorites" icon="❤️" title="نشان‌شده‌ها" desc="آگهی‌هایی که ذخیره کرده‌اید" />
        <Item href="/new" icon="➕" title="ثبت آگهی جدید" desc="در ۵ مرحلهٔ ساده" />
        <PushToggle user={user} />
      </div>

      <button
        onClick={() => {
          logout();
          router.push('/');
        }}
        className="mt-4 w-full rounded-2xl border border-red-200 bg-white py-3.5 text-sm font-bold text-red-600 transition hover:bg-red-50"
      >
        خروج از حساب
      </button>
    </div>
  );
}
