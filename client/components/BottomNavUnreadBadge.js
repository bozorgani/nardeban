'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { api } from '../lib/api';
import { useSocket } from '../lib/useSocket';

/**
 * badge نخواندهٔ چت به‌صورت leaf client component
 * --------------------------------------------------------------------------
 * خودِ shell نوار پایین ثابت و سبک است؛ فقط badge نیاز به auth/socket/state دارد.
 */
export default function BottomNavUnreadBadge() {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);

  const loadUnread = () =>
    api('/chat/unread-count').then((d) => setUnread(d.total)).catch(() => {});

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
    const t = setTimeout(loadUnread, 250);
    return () => clearTimeout(t);
  }, [user]);

  if (unread <= 0) return null;

  return (
    <span className="absolute -left-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[9px] font-bold text-white">
      {Number(unread).toLocaleString('fa-IR')}
    </span>
  );
}
