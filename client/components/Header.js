'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { api, CITIES } from '../lib/api';
import { useSocket } from '../lib/useSocket';
import { cityLabel, parseCities } from '../lib/cities';
import CityModal from './CityModal';

function ChatLink() {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);

  const load = () =>
    api('/chat/unread-count').then((d) => setUnread(d.total)).catch(() => {});

  // ⚡ پیام جدید → فوراً باج آپدیت می‌شود (بدون انتظار polling)
  useSocket({ 'msg:notify': load, 'msgs:read': load }, !!user);

  useEffect(() => {
    if (!user) return;
    load();
    const t = setInterval(load, 30000); // fallback آهسته
    return () => clearInterval(t);
  }, [user]);

  if (!user) return null;
  return (
    <Link
      href="/chat"
      className="relative flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2.5 text-sm transition hover:border-gray-300"
      title="چت نردبان"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
      </svg>
      <span className="hidden lg:inline">چت</span>
      {unread > 0 && (
        <span className="absolute -left-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white shadow">
          {Number(unread).toLocaleString('fa-IR')}
        </span>
      )}
    </Link>
  );
}

function SearchBar() {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const [cityOpen, setCityOpen] = useState(false);
  const cities = parseCities(params.get('city'));

  // وقتی URL عوض شد، مقدار باکس همگام بماند
  useEffect(() => {
    setQ(params.get('q') || '');
  }, [params]);

  const submit = (e) => {
    e.preventDefault();
    // فیلترهای فعلی (شهر، دسته و...) حفظ می‌شوند
    const sp = new URLSearchParams(params.toString());
    if (q.trim()) sp.set('q', q.trim());
    else sp.delete('q');
    sp.delete('page');
    router.push(`/?${sp.toString()}`);
  };

  const applyCities = (list) => {
    const sp = new URLSearchParams(params.toString());
    if (list.length) sp.set('city', list.join(','));
    else sp.delete('city');
    sp.delete('page');
    router.push(`/?${sp.toString()}`);
  };

  return (
    <>
      <form onSubmit={submit} className="flex flex-1 items-center gap-2">
        <div className="relative flex-1">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="جستجو در همهٔ آگهی‌ها..."
            className="w-full rounded-xl border border-gray-200 bg-gray-100 py-2.5 pr-10 pl-3 text-sm outline-none transition focus:border-brand focus:bg-white"
          />
          <button
            type="submit"
            aria-label="جستجو"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </button>
        </div>

        {/* دکمه شهر — موبایل و دسکتاپ، باز کردن مودال کامل */}
        <button
          type="button"
          onClick={() => setCityOpen(true)}
          className="flex shrink-0 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-bold text-gray-700 transition hover:border-gray-300"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z" /><circle cx="12" cy="10" r="3" />
          </svg>
          {cityLabel(cities)}
        </button>
      </form>

      <CityModal
        open={cityOpen}
        onClose={() => setCityOpen(false)}
        selected={cities}
        onApply={applyCities}
      />
    </>
  );
}

export default function Header() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // بستن منو با کلیک بیرون
  useEffect(() => {
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:gap-4">
        <Link href="/" className="flex shrink-0 items-center gap-1.5 text-xl font-black text-brand">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M8 3v18M16 3v18M8 7h8M8 12h8M8 17h8" />
          </svg>
          <span className="hidden sm:inline">نردبان</span>
        </Link>

        <Suspense fallback={<div className="flex-1" />}>
          <SearchBar />
        </Suspense>

        {/* در موبایل ناوبری پایین جایگزین است */}
        <nav className="hidden shrink-0 items-center gap-2 md:flex">
          {user?.role === 'admin' && (
            <Link
              href="/admin"
              className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-bold text-amber-700 transition hover:bg-amber-100"
              title="پنل مدیریت"
            >
              👑 <span className="hidden lg:inline">پنل مدیریت</span>
            </Link>
          )}
          <ChatLink />
          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2.5 text-sm transition hover:border-gray-300"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.5-6 8-6s8 2 8 6" />
                </svg>
                <span className="hidden sm:inline">{user.name || 'نردبان من'}</span>
              </button>
              {menuOpen && (
                <div
                  className="absolute left-0 mt-2 w-48 overflow-hidden rounded-xl border border-gray-200 bg-white text-sm shadow-xl"
                  onClick={() => setMenuOpen(false)}
                >
                  <div className="border-b bg-gray-50 px-4 py-2.5 text-xs text-gray-500" dir="ltr">{user.phone}</div>
                  <Link href="/my-ads" className="block px-4 py-2.5 hover:bg-gray-50">📋 آگهی‌های من</Link>
                  <Link href="/chat" className="block px-4 py-2.5 hover:bg-gray-50">💬 چت و تماس</Link>
                  <Link href="/favorites" className="block px-4 py-2.5 hover:bg-gray-50">❤️ نشان‌شده‌ها</Link>
                  <button onClick={logout} className="block w-full px-4 py-2.5 text-right text-red-600 hover:bg-red-50">
                    خروج
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/auth" className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm transition hover:border-gray-300">
              ورود
            </Link>
          )}
          <Link
            href="/new"
            className="rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-dark"
          >
            + ثبت آگهی
          </Link>
        </nav>
      </div>
    </header>
  );
}
