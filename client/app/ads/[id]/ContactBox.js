'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../../lib/api';
import { useAuth } from '../../../lib/AuthContext';
import NamePrompt from '../../../components/NamePrompt';

export default function ContactBox({ adId, ownerId, phone, callEnabled = true, chatEnabled = true }) {
  const { user } = useAuth();
  const router = useRouter();
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
      else alert(err.message);
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
        <div className="flex flex-1 gap-2">
          {callEnabled && (
            <a
              href={`tel:${phone}`}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand py-3 text-sm font-bold text-white transition hover:bg-brand-dark"
              dir="ltr"
            >
              📞 {phone}
            </a>
          )}
          {chatEnabled && (
            <button
              type="button"
              onClick={startChat}
              disabled={busy}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-brand py-3 text-sm font-bold text-brand transition hover:bg-brand-light disabled:opacity-50"
            >
              💬 {busy ? '...' : 'چت'}
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-1 gap-2">
          {callEnabled && (
            <button
              onClick={reveal}
              className="flex-1 rounded-xl bg-brand py-3 text-sm font-bold text-white transition hover:bg-brand-dark"
            >
              اطلاعات تماس
            </button>
          )}
          {chatEnabled && (
            <button
              onClick={startChat}
              disabled={busy}
              className={`flex items-center justify-center gap-1.5 rounded-xl border-2 border-brand py-3 text-sm font-bold text-brand transition hover:bg-brand-light disabled:opacity-50 ${callEnabled ? 'px-5' : 'flex-1'}`}
            >
              💬 {busy ? '...' : 'چت'}
            </button>
          )}
        </div>
      )}

      <NamePrompt open={askName} onClose={() => setAskName(false)} onDone={startChat} />
    </>
  );
}
