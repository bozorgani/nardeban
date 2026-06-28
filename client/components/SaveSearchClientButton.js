'use client';

import { useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { api } from '../lib/api';
import { useAuth } from '../lib/AuthContext';
import { useToast } from './Toast';

/**
 * لایهٔ تعاملیِ دکمهٔ ذخیرهٔ جستجو
 * --------------------------------------------------------------------------
 * منطق تعاملی (auth/router/toast/POST) در کلاینت می‌ماند، اما محاسباتِ ثابتِ
 * برچسب/وجود فیلتر و تصمیم برای رندر اولیه به wrapper سروری منتقل شده تا JS
 * ارسالی و hydration این بخش کمتر شود.
 */
export default function SaveSearchClientButton({ initialPayload }) {
  const { user } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    if (!user) {
      const qs = params.toString();
      const dest = qs ? `${pathname}?${qs}` : pathname;
      return router.push(`/auth?next=${encodeURIComponent(dest)}`);
    }
    setBusy(true);
    try {
      await api('/saved-searches', {
        method: 'POST',
        body: initialPayload,
      });
      setSaved(true);
      toast.success('با انتشار آگهی جدیدِ مطابق، باخبر می‌شوید', { title: '🔔 جستجو ذخیره شد' });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={save}
      disabled={busy || saved}
      className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl border px-3 py-2 text-xs font-bold transition ${
        saved
          ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
          : 'border-brand/40 text-brand hover:bg-brand-light'
      }`}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
      {saved ? 'ذخیره شد ✓' : 'ذخیره جستجو'}
    </button>
  );
}
