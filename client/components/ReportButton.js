'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, usePathname } from 'next/navigation';
import { api } from '../lib/api';
import { useAuth } from '../lib/AuthContext';
import { useToast } from './Toast';
import { useModalA11y } from '../lib/useModalA11y';

export default function ReportButton({ adId, ownerId }) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();

  const [open, setOpen] = useState(false);
  const dialogRef = useModalA11y(open, () => setOpen(false));
  const [reasons, setReasons] = useState([]);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [reported, setReported] = useState(false);

  const isOwner = user && String(user.id) === String(ownerId);

  // وضعیت قبلی گزارش من
  useEffect(() => {
    if (!user || isOwner) return;
    api(`/reports/mine/${adId}`)
      .then((d) => setReported(d.reported))
      .catch(() => {});
  }, [user, adId, isOwner]);

  const openModal = async () => {
    if (!user) return router.push(`/auth?next=${encodeURIComponent(pathname)}`);
    setOpen(true);
    if (!reasons.length) {
      try {
        const d = await api('/reports/reasons');
        setReasons(d.reasons);
      } catch {
        /* ignore */
      }
    }
  };

  const submit = async () => {
    if (!reason) return toast.warning('یک دلیل انتخاب کنید');
    setBusy(true);
    try {
      await api('/reports', { method: 'POST', body: { adId, reason, details } });
      setReported(true);
      setOpen(false);
      setReason('');
      setDetails('');
      toast.success('گزارش شما ثبت شد و توسط تیم بفروش بررسی می‌شود', {
        title: '🛡️ ممنون از همراهی شما',
        duration: 5000,
      });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (isOwner) return null;

  return (
    <>
      <button
        onClick={openModal}
        className={`flex items-center gap-1.5 text-xs transition ${
          reported ? 'text-amber-600' : 'text-gray-400 hover:text-red-500'
        }`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
          <path d="M4 22v-7" />
        </svg>
        {reported ? 'گزارش شما ثبت شده ✓' : 'گزارش تخلف آگهی'}
      </button>

      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[85] flex items-end justify-center p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" ref={dialogRef}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
            <div className="dialog-in relative max-h-[88vh] w-full overflow-y-auto rounded-t-3xl bg-white p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:max-w-md sm:rounded-3xl sm:shadow-2xl">
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-200 sm:hidden" />
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-xl">🛡️</span>
                <div>
                  <h3 className="text-lg font-extrabold text-gray-900">گزارش تخلف</h3>
                  <p className="text-xs text-gray-400">گزارش شما محرمانه است و به فروشنده نمایش داده نمی‌شود</p>
                </div>
              </div>

              {/* دلایل */}
              <div className="space-y-2">
                {reasons.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReason(r)}
                    className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-right text-sm transition ${
                      reason === r
                        ? 'border-brand bg-brand-light font-bold text-brand'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {r}
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full border-2 text-[10px] text-white transition ${
                        reason === r ? 'border-brand bg-brand' : 'border-gray-300'
                      }`}
                    >
                      {reason === r && '✓'}
                    </span>
                  </button>
                ))}
                {!reasons.length && <p className="py-6 text-center text-sm text-gray-400">در حال بارگذاری دلایل...</p>}
              </div>

              {/* توضیحات */}
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={2}
                maxLength={500}
                placeholder="توضیحات بیشتر (اختیاری)..."
                className="mt-3 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-brand focus:bg-white"
              />

              <div className="mt-4 flex gap-2">
                <button
                  onClick={submit}
                  disabled={busy || !reason}
                  className="flex-1 rounded-2xl bg-red-500 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-red-500/25 transition hover:bg-red-600 disabled:opacity-40 disabled:shadow-none"
                >
                  {busy ? 'در حال ارسال...' : 'ثبت گزارش'}
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-2xl border border-gray-200 px-6 py-3.5 text-sm text-gray-500 transition hover:border-gray-300"
                >
                  انصراف
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
