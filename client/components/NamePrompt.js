'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/AuthContext';

/**
 * شیت «نام شما» — قبل از شروع چت، اگر کاربر نام نداشته باشد باز می‌شود.
 * onDone بعد از ذخیره موفق نام صدا زده می‌شود.
 */
export default function NamePrompt({ open, onClose, onDone }) {
  const { refresh } = useAuth();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!open || typeof document === 'undefined') return null;

  const save = async (e) => {
    e?.preventDefault();
    const value = name.trim();
    if (value.length < 3) return setError('نام باید حداقل ۳ حرف باشد');
    setBusy(true);
    setError('');
    try {
      await api('/users/me', { method: 'PATCH', body: { name: value } });
      await refresh();
      onClose();
      onDone?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:inset-x-auto md:left-1/2 md:top-1/2 md:bottom-auto md:w-[400px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-3xl md:shadow-2xl">
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-gray-200 md:hidden" />
        <div className="mb-4 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-light text-2xl">👋</span>
          <h3 className="mt-3 text-lg font-extrabold text-gray-900">نام شما چیست؟</h3>
          <p className="mt-1 text-sm leading-7 text-gray-400">
            برای شروع گفتگو، لازم است طرف مقابل بداند با چه کسی صحبت می‌کند.
          </p>
        </div>

        {error && <p className="mb-3 rounded-2xl bg-red-50 px-4 py-2.5 text-sm text-red-600">⚠️ {error}</p>}

        <form onSubmit={save}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            autoFocus
            placeholder="مثلاً: امین بزرگانی"
            className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-center text-sm outline-none transition focus:border-brand focus:bg-white"
          />
          <button
            disabled={busy || name.trim().length < 3}
            className="mt-4 w-full rounded-2xl bg-brand py-3.5 text-sm font-extrabold text-white shadow-lg shadow-brand/25 transition hover:bg-brand-dark disabled:opacity-40 disabled:shadow-none"
          >
            {busy ? 'در حال ذخیره...' : 'ذخیره و شروع گفتگو'}
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
}
