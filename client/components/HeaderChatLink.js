'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { api } from '../lib/api';
import { useSocket } from '../lib/useSocket';

export default function HeaderChatLink() {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);

  const load = () =>
    api('/chat/unread-count').then((d) => setUnread(d.total)).catch(() => {});

  useSocket(
    {
      'msg:notify': (payload) => {
        if (payload?.self) return;
        load();
      },
      'msgs:read': load,
    },
    !!user
  );

  useEffect(() => {
    if (!user) return;
    const initial = setTimeout(load, 250);
    let t = null;
    const start = () => {
      if (t) return;
      t = setInterval(load, 30000);
    };
    const stop = () => {
      if (t) { clearInterval(t); t = null; }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        load();
        start();
      } else {
        stop();
      }
    };
    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearTimeout(initial);
      document.removeEventListener('visibilitychange', onVisibility);
      stop();
    };
  }, [user]);

  if (!user) return null;
  return (
    <Link
      href="/chat"
      className="relative flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2.5 text-sm transition hover:border-gray-300"
      title="چت بفروش"
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
