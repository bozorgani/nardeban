'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { api } from '../lib/api';
import { useSocket } from '../lib/useSocket';

const ICONS = {
  home: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M9 21v-6h6v6" />
    </svg>
  ),
  heart: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 14c1.5-1.5 2.5-3.2 2.5-5A4.5 4.5 0 0 0 17 4.5c-2 0-3.5 1-5 3-1.5-2-3-3-5-3A4.5 4.5 0 0 0 2.5 9c0 1.8 1 3.5 2.5 5l7 7 7-7z" />
    </svg>
  ),
  plus: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  chat: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  ),
  user: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.5-6 8-6s8 2 8 6" />
    </svg>
  ),
};

export default function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);

  const loadUnread = () =>
    api('/chat/unread-count').then((d) => setUnread(d.total)).catch(() => {});

  // M8: پیام ارسالی خودِ این کاربر باعث reload بی‌مورد نشود (self=true).
  useSocket(
    {
      'msg:notify': (payload) => {
        if (payload?.self) return;
        loadUnread();
      },
      'msgs:read': loadUnread,
    },
    !!user
  );

  useEffect(() => {
    if (!user) return setUnread(0);
    loadUnread();
  }, [user]);

  const items = [
    { href: '/', label: 'آگهی‌ها', icon: 'home' },
    { href: '/favorites', label: 'نشان‌ها', icon: 'heart' },
    { href: '/new', label: 'ثبت آگهی', icon: 'plus', primary: true },
    { href: '/chat', label: 'چت و تماس', icon: 'chat', badge: unread },
    { href: '/me', label: 'بفروش من', icon: 'user' },
  ];

  const isActive = (href) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  // در صفحهٔ چت (تمام‌صفحه در موبایل) نوار پایین مخفی می‌شود تا روی ورودی پیام نیفتد (موارد ۹،۱۰)
  if (pathname.startsWith('/chat')) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="grid grid-cols-5">
        {items.map((it) => {
          const active = isActive(it.href);
          if (it.primary) {
            return (
              <Link key={it.href} href={it.href} className="flex flex-col items-center justify-center gap-0.5 py-1.5">
                <span className="flex h-10 w-10 -translate-y-3 items-center justify-center rounded-full bg-brand text-white shadow-lg shadow-brand/30 ring-4 ring-white">
                  {ICONS[it.icon]}
                </span>
                <span className={`-mt-2.5 text-[10px] ${active ? 'font-bold text-brand' : 'text-gray-500'}`}>
                  {it.label}
                </span>
              </Link>
            );
          }
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`relative flex flex-col items-center justify-center gap-0.5 py-2 transition ${
                active ? 'text-brand' : 'text-gray-400'
              }`}
            >
              <span className="relative">
                {ICONS[it.icon]}
                {it.badge > 0 && (
                  <span className="absolute -left-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[9px] font-bold text-white">
                    {Number(it.badge).toLocaleString('fa-IR')}
                  </span>
                )}
              </span>
              <span className={`text-[10px] ${active ? 'font-bold' : ''}`}>{it.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
