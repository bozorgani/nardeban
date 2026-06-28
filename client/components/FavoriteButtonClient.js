'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { api } from '../lib/api';
import { useAuth } from '../lib/AuthContext';

export default function FavoriteButtonClient({ adId, initialSaved = false }) {
  const { user, refresh } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [saved, setSaved] = useState(initialSaved);
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    if (!user) return router.push(`/auth?next=${encodeURIComponent(pathname)}`);
    setBusy(true);
    try {
      const data = await api(`/users/favorites/${adId}`, { method: 'POST' });
      setSaved(Boolean(data.saved));
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={busy}
      aria-label={saved ? 'حذف نشان' : 'نشان کردن'}
      title={saved ? 'حذف نشان' : 'نشان کردن'}
      className={`flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border px-3 py-3 text-sm transition disabled:opacity-50 ${
        saved
          ? 'border-rose-200 bg-rose-50 text-rose-500'
          : 'border-gray-200 text-gray-500 hover:border-rose-200 hover:text-rose-500'
      }`}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill={saved ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0"
      >
        <path d="M19 14c1.5-1.5 2.5-3.2 2.5-5A4.5 4.5 0 0 0 17 4.5c-2 0-3.5 1-5 3-1.5-2-3-3-5-3A4.5 4.5 0 0 0 2.5 9c0 1.8 1 3.5 2.5 5l7 7 7-7z" />
      </svg>
      <span className="hidden lg:inline">{saved ? 'نشان شده' : 'نشان کردن'}</span>
    </button>
  );
}
