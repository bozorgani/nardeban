'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, imgUrl, timeAgo } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { useSocket } from '../../lib/useSocket';

/* ------------------------------------------------------------------ */
/*  لیست گفتگوها (ستون راست)                                          */
/* ------------------------------------------------------------------ */
function ConversationList({ conversations, activeId, onPick, onlineMap }) {
  const [filter, setFilter] = useState('');

  if (!conversations.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <span className="text-5xl">💬</span>
        <p className="font-bold text-gray-600">هنوز گفتگویی ندارید</p>
        <p className="text-sm leading-6 text-gray-400">
          از صفحهٔ هر آگهی روی «چت» بزنید تا گفتگو شروع شود.
        </p>
      </div>
    );
  }

  const q = filter.trim();
  const shown = q
    ? conversations.filter(
        (c) =>
          (c.other?.name || '').includes(q) ||
          (c.ad?.title || '').includes(q) ||
          (c.lastMessage || '').includes(q)
      )
    : conversations;

  return (
    <>
      {/* جستجو در گفتگوها */}
      <div className="sticky top-0 z-10 border-b border-gray-100 bg-white p-3">
        <div className="relative">
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="جستجو در گفتگوها..."
            className="w-full rounded-xl border border-gray-100 bg-gray-50 py-2 pr-9 pl-3 text-xs outline-none transition focus:border-brand focus:bg-white"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
          </span>
        </div>
      </div>

      {shown.length === 0 && (
        <p className="py-8 text-center text-xs text-gray-400">گفتگویی با «{q}» پیدا نشد</p>
      )}

      <ul className="divide-y divide-gray-50">
      {shown.map((c) => {
        const online = onlineMap[String(c.other?._id)];
        return (
          <li key={c._id}>
            <button
              onClick={() => onPick(c._id)}
              className={`flex w-full items-center gap-3 px-4 py-3.5 text-right transition hover:bg-gray-50 ${
                activeId === c._id ? 'bg-brand-light/70' : ''
              }`}
            >
              {/* عکس آگهی + نقطه آنلاین */}
              <div className="relative h-12 w-12 flex-shrink-0">
                <div className="h-full w-full overflow-hidden rounded-xl bg-gray-100">
                  {c.ad?.images?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imgUrl(c.ad.images[0])} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xl">📦</div>
                  )}
                </div>
                {online && (
                  <span className="absolute -bottom-0.5 -left-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-green-500" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-sm font-bold text-gray-800" title={c.other?.name || 'کاربر نردبان'}>
                    {c.other?.name || 'کاربر نردبان'}
                  </span>
                  <span className={`flex-shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                    c.role === 'seller' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'
                  }`}>
                    {c.role === 'seller' ? 'خریدار' : 'فروشنده'}
                  </span>
                  <span className="flex-shrink-0 text-[10px] text-gray-400">
                    {timeAgo(c.lastMessageAt)}
                  </span>
                </div>
                <p className="truncate text-xs text-gray-400">{c.ad?.title}</p>
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-xs text-gray-500">{c.lastMessage || '—'}</p>
                  {c.unread > 0 && (
                    <span className="flex h-5 min-w-5 flex-shrink-0 items-center justify-center rounded-full bg-brand px-1.5 text-[10px] font-bold text-white">
                      {Number(c.unread).toLocaleString('fa-IR')}
                    </span>
                  )}
                </div>
              </div>
            </button>
          </li>
        );
      })}
      </ul>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  پنجره گفتگو (ستون چپ) — کاملاً Real-time                           */
/* ------------------------------------------------------------------ */
function ChatWindow({ conversationId, meId, onBack, onActivity }) {
  const [conv, setConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [otherOnline, setOtherOnline] = useState(false);
  const [connected, setConnected] = useState(true);

  const bottomRef = useRef(null);
  const otherIdRef = useRef(null);
  const typingTimerRef = useRef(null);
  const lastTypingSentRef = useRef(0);

  const scrollDown = (smooth = true) =>
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });

  /* ---------- رویدادهای سوکت ---------- */
  const socket = useSocket(
    {
      connect: () => {
        setConnected(true);
        // بعد از reconnect دوباره join و sync
        socket?.emit('conv:join', conversationId, (res) => {
          if (res?.ok) {
            setOtherOnline(res.otherOnline);
            otherIdRef.current = res.otherId;
          }
        });
      },
      disconnect: () => setConnected(false),

      'msg:new': ({ convId, message }) => {
        if (convId !== conversationId) return;
        setMessages((prev) =>
          prev.some((m) => m._id === message._id) ? prev : [...prev, message]
        );
        setOtherTyping(false);
        setTimeout(scrollDown, 40);
        // فوراً به عنوان خوانده‌شده علامت بزن (پنجره باز است)
        socket?.emit('msgs:read', { convId: conversationId });
        onActivity?.();
      },

      typing: ({ convId, userId, isTyping }) => {
        if (convId === conversationId && String(userId) !== String(meId)) {
          setOtherTyping(isTyping);
        }
      },

      'msgs:read': ({ convId }) => {
        if (convId !== conversationId) return;
        // همه پیام‌های من تیک دوتایی بخورند
        setMessages((prev) =>
          prev.map((m) => (String(m.sender) === String(meId) ? { ...m, read: true } : m))
        );
      },

      presence: ({ userId, online }) => {
        if (String(userId) === String(otherIdRef.current)) setOtherOnline(online);
      },
    },
    true
  );

  /* ---------- بارگذاری تاریخچه + join روم ---------- */
  useEffect(() => {
    let stop = false;
    setConv(null);
    setMessages([]);
    setOtherTyping(false);

    api(`/chat/conversations/${conversationId}/messages`)
      .then((d) => {
        if (stop) return;
        setConv(d.conversation);
        setMessages(d.messages);
        otherIdRef.current = String(d.conversation.other?._id);
        setTimeout(() => scrollDown(false), 50);
        onActivity?.();
      })
      .catch(() => {});

    socket?.emit('conv:join', conversationId, (res) => {
      if (res?.ok) {
        setOtherOnline(res.otherOnline);
        otherIdRef.current = res.otherId;
      }
    });

    return () => {
      stop = true;
      socket?.emit('typing', { convId: conversationId, isTyping: false });
      socket?.emit('conv:leave', conversationId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, socket]);

  /* ---------- fallback polling فقط وقتی سوکت قطع است ---------- */
  useEffect(() => {
    if (connected) return;
    const t = setInterval(async () => {
      try {
        const last = messages.at(-1)?._id;
        const d = await api(
          `/chat/conversations/${conversationId}/messages${last ? `?after=${last}` : ''}`
        );
        if (d.messages.length) {
          setMessages((prev) => [
            ...prev,
            ...d.messages.filter((m) => !prev.some((p) => p._id === m._id)),
          ]);
          setTimeout(scrollDown, 40);
        }
      } catch { /* ignore */ }
    }, 4000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, conversationId, messages]);

  /* ---------- اعلام «در حال نوشتن» (throttle ۱.۵ ثانیه) ---------- */
  const handleTyping = (value) => {
    setText(value);
    if (!socket) return;
    const now = Date.now();
    if (now - lastTypingSentRef.current > 1500) {
      socket.emit('typing', { convId: conversationId, isTyping: true });
      lastTypingSentRef.current = now;
    }
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      socket.emit('typing', { convId: conversationId, isTyping: false });
      lastTypingSentRef.current = 0;
    }, 2000);
  };

  /* ---------- ارسال پیام (سوکت با fallback به REST) ---------- */
  const send = async (e) => {
    e?.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setText('');
    clearTimeout(typingTimerRef.current);
    socket?.emit('typing', { convId: conversationId, isTyping: false });

    const appendMsg = (m) => {
      setMessages((prev) => (prev.some((p) => p._id === m._id) ? prev : [...prev, m]));
      setTimeout(scrollDown, 40);
      onActivity?.();
    };

    try {
      if (socket?.connected) {
        await new Promise((resolve, reject) => {
          socket.emit('msg:send', { convId: conversationId, text: body }, (res) => {
            if (res?.ok) {
              appendMsg(res.message);
              resolve();
            } else reject(new Error(res?.error || 'خطا در ارسال'));
          });
          setTimeout(() => reject(new Error('پاسخی از سرور نیامد')), 5000);
        });
      } else {
        const d = await api(`/chat/conversations/${conversationId}/messages`, {
          method: 'POST',
          body: { text: body },
        });
        appendMsg(d.message);
      }
    } catch (err) {
      setText(body);
      alert(err.message);
    } finally {
      setSending(false);
    }
  };

  if (!conv)
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-400">
        در حال بارگذاری گفتگو...
      </div>
    );

  const priceText = conv.ad?.isFree
    ? 'رایگان'
    : conv.ad?.price
      ? `${Number(conv.ad.price).toLocaleString('fa-IR')} تومان`
      : 'توافقی';

  let lastDay = '';

  return (
    <div className="flex h-full flex-col">
      {/* هدر گفتگو */}
      <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
        <button onClick={onBack} className="text-gray-400 hover:text-brand md:hidden">→</button>
        <Link href={`/ads/${conv.ad?._id}`} className="group flex min-w-0 flex-1 items-center gap-3">
          <div className="relative h-11 w-11 flex-shrink-0">
            <div className="h-full w-full overflow-hidden rounded-xl bg-gray-100">
              {conv.ad?.images?.[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imgUrl(conv.ad.images[0])} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-lg">📦</div>
              )}
            </div>
            {otherOnline && (
              <span className="absolute -bottom-0.5 -left-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-green-500" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-gray-800 group-hover:text-brand">
              {conv.ad?.title}
            </p>
            <p className="text-xs text-gray-400">
              {priceText} · {conv.other?.name || 'کاربر نردبان'}
              {' · '}
              {otherTyping ? (
                <span className="font-bold text-brand">در حال نوشتن...</span>
              ) : otherOnline ? (
                <span className="text-green-600">آنلاین</span>
              ) : (
                'آفلاین'
              )}
            </p>
          </div>
        </Link>
        <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${
          conv.role === 'seller' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'
        }`}>
          {conv.role === 'seller' ? 'شما فروشنده‌اید' : 'شما خریدارید'}
        </span>
      </div>

      {/* بنر قطع اتصال */}
      {!connected && (
        <div className="bg-amber-50 px-4 py-1.5 text-center text-[11px] text-amber-700">
          اتصال لحظه‌ای قطع شد — در حال تلاش مجدد... (پیام‌ها با تأخیر می‌رسند)
        </div>
      )}

      {/* پیام‌ها */}
      <div className="flex-1 space-y-1 overflow-y-auto bg-gray-50/60 px-4 py-4">
        {messages.length === 0 && (
          <div className="py-10 text-center text-sm text-gray-400">
            شروع گفتگو — اولین پیام را بفرستید 👋
            <p className="mx-auto mt-3 max-w-xs rounded-xl bg-amber-50 px-3 py-2 text-xs leading-6 text-amber-700">
              ⚠️ پیش از پرداخت هر مبلغی، کالا را حضوری ببینید.
            </p>
          </div>
        )}
        {messages.map((m) => {
          const mine = String(m.sender) === String(meId);
          const day = new Date(m.createdAt).toLocaleDateString('fa-IR');
          const showDay = day !== lastDay;
          lastDay = day;
          return (
            <div key={m._id}>
              {showDay && (
                <div className="my-3 text-center">
                  <span className="rounded-full bg-gray-200/70 px-3 py-1 text-[10px] text-gray-500">
                    {day}
                  </span>
                </div>
              )}
              <div className={`flex ${mine ? 'flex-row-reverse justify-start' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm leading-7 shadow-sm ${
                    mine
                      ? 'rounded-bl-md bg-brand text-white'
                      : 'rounded-br-md border border-gray-100 bg-white text-gray-800'
                  }`}
                >
                  <p className="whitespace-pre-line break-words">{m.text}</p>
                  <p className={`mt-1 flex items-center gap-1 text-[9px] ${mine ? 'text-white/70' : 'text-gray-300'}`}>
                    {new Date(m.createdAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                    {mine && <span>{m.read ? '✓✓' : '✓'}</span>}
                  </p>
                </div>
              </div>
            </div>
          );
        })}

        {/* حباب «در حال نوشتن» */}
        {otherTyping && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-br-md border border-gray-100 bg-white px-4 py-3 shadow-sm">
              <span className="flex gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-gray-300" style={{ animationDelay: '0ms' }} />
                <span className="h-2 w-2 animate-bounce rounded-full bg-gray-300" style={{ animationDelay: '150ms' }} />
                <span className="h-2 w-2 animate-bounce rounded-full bg-gray-300" style={{ animationDelay: '300ms' }} />
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* پاسخ‌های آماده — فقط وقتی هنوز چیزی ننوشته */}
      {!text && (
        <div className="flex gap-2 overflow-x-auto border-t border-gray-50 bg-white px-4 pt-2.5">
          {(conv.role === 'seller'
            ? ['سلام، بله موجود است', 'مقطع است', 'فردا می‌توانید ببینید', 'تخفیف جزئی دارد']
            : ['سلام، هنوز موجوده؟', 'قیمت آخر چنده؟', 'تخفیف هم می‌دید؟', 'کی می‌تونم ببینمش؟']
          ).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => { handleTyping(s); }}
              className="flex-shrink-0 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-[11px] text-gray-600 transition hover:border-brand hover:text-brand"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* ورودی پیام */}
      <form onSubmit={send} className="flex items-end gap-2 bg-white px-4 py-3">
        <textarea
          value={text}
          onChange={(e) => {
            handleTyping(e.target.value);
            // ارتفاع خودکار
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              e.target.style.height = 'auto';
              send();
            }
          }}
          rows={1}
          placeholder="پیام خود را بنویسید..."
          className="max-h-32 flex-1 resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm leading-6 outline-none transition focus:border-brand focus:bg-white"
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-brand text-white shadow-md transition hover:scale-105 hover:bg-brand-dark disabled:opacity-40 disabled:hover:scale-100"
          aria-label="ارسال"
        >
          {sending ? (
            <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.2-8.56" strokeLinecap="round"/></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ transform: 'rotate(180deg)' }}>
              <path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          )}
        </button>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  صفحه اصلی چت                                                       */
/* ------------------------------------------------------------------ */
function ChatPageInner() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const activeId = params.get('c');

  const [conversations, setConversations] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [onlineMap, setOnlineMap] = useState({});

  const refreshList = useCallback(() => {
    api('/chat/conversations')
      .then((d) => {
        setConversations(d.conversations);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  // نوتیف سراسری → آپدیت زنده لیست
  useSocket(
    {
      'msg:notify': () => refreshList(),
      presence: ({ userId, online }) =>
        setOnlineMap((m) => ({ ...m, [String(userId)]: online })),
    },
    !!user
  );

  useEffect(() => {
    if (!loading && !user) router.replace('/auth?next=/chat');
    if (user) refreshList();
  }, [loading, user, router, refreshList]);

  const pick = (id) => router.push(`/chat?c=${id}`);

  if (loading || !user || !loaded)
    return <p className="py-16 text-center text-gray-400">در حال بارگذاری چت...</p>;

  return (
    <div className="mx-auto max-w-7xl">
      {/* ارتفاع تقریباً تمام‌صفحه: هدر ~64px + پدینگ. در موبایل جای BottomNav هم حساب شده */}
      <div className="grid h-[calc(100dvh-160px)] min-h-[520px] grid-cols-1 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm md:h-[calc(100dvh-128px)] md:grid-cols-[360px_1fr]">
        <div className={`overflow-y-auto border-l border-gray-100 ${activeId ? 'hidden md:block' : ''}`}>
          <ConversationList
            conversations={conversations}
            activeId={activeId}
            onPick={pick}
            onlineMap={onlineMap}
          />
        </div>

        <div className={`${activeId ? '' : 'hidden md:flex'} h-full overflow-hidden`}>
          {activeId ? (
            <div className="h-full w-full">
              <ChatWindow
                conversationId={activeId}
                meId={user.id}
                onBack={() => router.push('/chat')}
                onActivity={refreshList}
              />
            </div>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-gray-300">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
              </svg>
              <p className="text-sm">یک گفتگو را از فهرست انتخاب کنید</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<p className="py-16 text-center text-gray-400">در حال بارگذاری...</p>}>
      <ChatPageInner />
    </Suspense>
  );
}
