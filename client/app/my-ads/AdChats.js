'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, timeAgo } from '../../lib/api';

// لیست گفتگوهای خریداران برای یک آگهی (نمای فروشنده)
export default function AdChats({ adId, totalUnread }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [convs, setConvs] = useState(null);

  const toggle = async () => {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen && convs === null) {
      try {
        const d = await api(`/chat/ad/${adId}/conversations`);
        setConvs(d.conversations);
      } catch {
        setConvs([]);
      }
    }
  };

  return (
    <div className="mt-3 border-t border-gray-100 pt-3">
      <button
        onClick={toggle}
        className="flex w-full items-center justify-between text-sm font-bold text-gray-700 transition hover:text-brand"
      >
        <span className="flex items-center gap-2">
          💬 چت خریداران
          {totalUnread > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[10px] font-bold text-white">
              {Number(totalUnread).toLocaleString('fa-IR')} جدید
            </span>
          )}
        </span>
        <span className={`text-xs text-gray-300 transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {open && (
        <div className="mt-2">
          {convs === null ? (
            <p className="py-3 text-center text-xs text-gray-400">در حال بارگذاری...</p>
          ) : convs.length === 0 ? (
            <p className="rounded-lg bg-gray-50 py-3 text-center text-xs text-gray-400">
              هنوز خریداری برای این آگهی پیام نداده است.
            </p>
          ) : (
            <ul className="divide-y divide-gray-50 overflow-hidden rounded-xl border border-gray-100">
              {convs.map((c) => (
                <li key={c._id}>
                  <button
                    onClick={() => router.push(`/chat?c=${c._id}`)}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-right transition hover:bg-gray-50"
                  >
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-brand-light text-sm font-bold text-brand">
                      {(c.buyer?.name || 'خ').charAt(0)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-bold text-gray-800">
                          {c.buyer?.name || 'خریدار'}
                        </span>
                        <span className="flex-shrink-0 text-[10px] text-gray-400">
                          {timeAgo(c.lastMessageAt)}
                        </span>
                      </span>
                      <span className="block truncate text-xs text-gray-500">
                        {c.lastMessage || 'گفتگو شروع شده'}
                      </span>
                    </span>
                    {c.unread > 0 && (
                      <span className="flex h-5 min-w-5 flex-shrink-0 items-center justify-center rounded-full bg-brand px-1.5 text-[10px] font-bold text-white">
                        {Number(c.unread).toLocaleString('fa-IR')}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
