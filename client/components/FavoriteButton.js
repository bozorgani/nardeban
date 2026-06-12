'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../lib/api';
import { useAuth } from '../lib/AuthContext';

export default function FavoriteButton({ adId }) {
  const { user, refresh } = useAuth();
  const router = useRouter();
  const saved = user?.favorites?.some((f) => f === adId || f?._id === adId);
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    if (!user) return router.push('/auth');
    setBusy(true);
    try {
      await api(`/users/favorites/${adId}`, { method: 'POST' });
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
      title="نشان کردن"
    >
      {saved ? '❤️ نشان شده' : '🤍 نشان کردن'}
    </button>
  );
}
