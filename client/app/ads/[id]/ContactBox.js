'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../../lib/api';
import { useAuth } from '../../../lib/AuthContext';
import NamePrompt from '../../../components/NamePrompt';
import { useToast } from '../../../components/Toast';

const PhoneIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
);

const ChatIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
  </svg>
);

export default function ContactBox({ adId, ownerId, phone, callEnabled = true, chatEnabled = true }) {
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [askName, setAskName] = useState(false);

  const isOwner = user && String(user.id) === String(ownerId);

  const reveal = () => {
    if (!user) return router.push('/auth');
    setShow(true);
  };

  const startChat = async () => {
    if (!user) return router.push('/auth'); // چت فقط با ورود
    // برای چت داشتن نام الزامی است
    if (!user.name || !user.name.trim()) return setAskName(true);
    if (busy) return;
    setBusy(true);
    try {
      const d = await api('/chat/conversations', { method: 'POST', body: { adId } });
      router.push(`/chat?c=${d.conversationId}`);
    } catch (err) {
      if (err.message === 'NAME_REQUIRED') setAskName(true);
      else toast.error(err.message);
      setBusy(false);
    }
  };

  if (isOwner) {
    return (
      <button
        onClick={() => router.push(`/my-ads`)}
        className="flex-1 rounded-xl border border-gray-300 py-3 text-sm font-bold text-gray-600 transition hover:border-gray-400"
      >
        این آگهی شماست — مدیریت آگهی
      </button>
    );
  }

  if (!callEnabled && !chatEnabled) return null;

  return (
    <>
      {show ? (
        /* بعد از نمایش شماره:
           موبایل → شماره تمام‌عرض در یک ردیف، چت ردیف بعد (شماره هرگز نمی‌شکند)
           دسکتاپ → کنار هم */
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row">
          {callEnabled && (
            <a
              href={`tel:${phone}`}
              className="flex min-w-0 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-brand px-3 py-3 text-sm font-bold text-white transition hover:bg-brand-dark"
            >
              {PhoneIcon}
              <span dir="ltr" className="tracking-wider">{phone}</span>
            </a>
          )}
          {chatEnabled && (
            <button
              type="button"
              onClick={startChat}
              disabled={busy}
              className="flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl border-2 border-brand px-3 py-3 text-sm font-bold text-brand transition hover:bg-brand-light disabled:opacity-50 sm:flex-none sm:px-6"
            >
              {ChatIcon}
              {busy ? '...' : 'چت'}
            </button>
          )}
        </div>
      ) : (
        <div className="flex min-w-0 flex-1 gap-2">
          {callEnabled && (
            <button
              onClick={reveal}
              className="min-w-0 flex-1 whitespace-nowrap rounded-xl bg-brand px-3 py-3 text-sm font-bold text-white transition hover:bg-brand-dark"
            >
              اطلاعات تماس
            </button>
          )}
          {chatEnabled && (
            <button
              onClick={startChat}
              disabled={busy}
              className={`flex items-center justify-center gap-2 whitespace-nowrap rounded-xl border-2 border-brand px-4 py-3 text-sm font-bold text-brand transition hover:bg-brand-light disabled:opacity-50 ${callEnabled ? '' : 'flex-1'}`}
            >
              {ChatIcon}
              {busy ? '...' : 'چت'}
            </button>
          )}
        </div>
      )}

      <NamePrompt open={askName} onClose={() => setAskName(false)} onDone={startChat} />
    </>
  );
}
