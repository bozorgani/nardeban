'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * سیستم اعلان سراسری نردبان (بدون کتابخانه):
 *   const toast = useToast();
 *   toast.success('ثبت شد');  toast.error('خطا');  toast.info('...')
 *   const ok = await toast.confirm({ title, message, confirmText, danger });
 */
const ToastContext = createContext(null);
let idCounter = 0;

const TYPES = {
  success: {
    bar: 'bg-emerald-500',
    iconBg: 'bg-emerald-50 text-emerald-600',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
    ),
  },
  error: {
    bar: 'bg-red-500',
    iconBg: 'bg-red-50 text-red-600',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
    ),
  },
  info: {
    bar: 'bg-blue-500',
    iconBg: 'bg-blue-50 text-blue-600',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="9" strokeWidth="2"/><path d="M12 8h.01M12 12v4"/></svg>
    ),
  },
  warning: {
    bar: 'bg-amber-400',
    iconBg: 'bg-amber-50 text-amber-600',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>
    ),
  },
};

function ToastItem({ t, onClose }) {
  const [leaving, setLeaving] = useState(false);
  const cfg = TYPES[t.type] || TYPES.info;

  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), t.duration - 250);
    const t2 = setTimeout(onClose, t.duration);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [t.duration, onClose]);

  return (
    <div
      className={`pointer-events-auto relative flex w-full max-w-sm items-center gap-3 overflow-hidden rounded-2xl border border-gray-100 bg-white py-3 pr-3 pl-4 shadow-xl shadow-gray-900/10 transition-all duration-250 ${
        leaving ? 'translate-y-2 opacity-0' : 'toast-in'
      }`}
      role="status"
    >
      <span className={`absolute inset-y-0 right-0 w-1 ${cfg.bar}`} />
      <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${cfg.iconBg}`}>
        {cfg.icon}
      </span>
      <div className="min-w-0 flex-1">
        {t.title && <p className="text-sm font-extrabold text-gray-800">{t.title}</p>}
        <p className={`text-sm leading-6 ${t.title ? 'text-gray-500' : 'font-bold text-gray-800'}`}>{t.message}</p>
      </div>
      <button onClick={() => { setLeaving(true); setTimeout(onClose, 200); }} className="flex-shrink-0 rounded-lg p-1.5 text-gray-300 transition hover:bg-gray-50 hover:text-gray-500" aria-label="بستن">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    </div>
  );
}

function ConfirmDialog({ dialog, onResolve }) {
  const [closing, setClosing] = useState(false);
  const resolve = (val) => {
    setClosing(true);
    setTimeout(() => onResolve(val), 180);
  };

  // Escape = انصراف
  useEffect(() => {
    const fn = (e) => e.key === 'Escape' && resolve(false);
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`fixed inset-0 z-[95] flex items-end justify-center p-4 transition-opacity duration-200 sm:items-center ${closing ? 'opacity-0' : 'opacity-100'}`}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={() => resolve(false)} />
      <div className={`relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl transition-transform duration-200 ${closing ? 'scale-95' : 'dialog-in'}`} role="alertdialog" aria-modal="true">
        <span className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-2xl ${dialog.danger ? 'bg-red-50' : 'bg-brand-light'}`}>
          {dialog.icon || (dialog.danger ? '🗑️' : '❓')}
        </span>
        <h3 className="mt-4 text-center text-lg font-extrabold text-gray-900">{dialog.title}</h3>
        {dialog.message && (
          <p className="mt-2 text-center text-sm leading-7 text-gray-500">{dialog.message}</p>
        )}
        <div className="mt-6 flex gap-2">
          <button
            onClick={() => resolve(true)}
            autoFocus
            className={`flex-1 rounded-2xl py-3.5 text-sm font-extrabold text-white shadow-lg transition ${
              dialog.danger
                ? 'bg-red-500 shadow-red-500/25 hover:bg-red-600'
                : 'bg-brand shadow-brand/25 hover:bg-brand-dark'
            }`}
          >
            {dialog.confirmText || 'تایید'}
          </button>
          <button onClick={() => resolve(false)} className="rounded-2xl border border-gray-200 px-6 py-3.5 text-sm text-gray-500 transition hover:border-gray-300">
            {dialog.cancelText || 'انصراف'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);
  const dialogResolver = useRef(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const push = useCallback((type, message, opts = {}) => {
    const id = ++idCounter;
    setToasts((prev) => [...prev.slice(-3), { id, type, message, title: opts.title, duration: opts.duration || 3800 }]);
  }, []);

  const api = useRef({
    success: (m, o) => push('success', m, o),
    error: (m, o) => push('error', m, o),
    info: (m, o) => push('info', m, o),
    warning: (m, o) => push('warning', m, o),
    confirm: (opts) =>
      new Promise((res) => {
        dialogResolver.current = res;
        setDialog(opts);
      }),
  }).current;

  const resolveDialog = (val) => {
    setDialog(null);
    dialogResolver.current?.(val);
    dialogResolver.current = null;
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      {mounted &&
        createPortal(
          <>
            <div className="pointer-events-none fixed inset-x-4 bottom-20 z-[90] flex flex-col items-center gap-2 md:bottom-6">
              {toasts.map((t) => (
                <ToastItem key={t.id} t={t} onClose={() => setToasts((p) => p.filter((x) => x.id !== t.id))} />
              ))}
            </div>
            {dialog && <ConfirmDialog dialog={dialog} onResolve={resolveDialog} />}
          </>,
          document.body
        )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
