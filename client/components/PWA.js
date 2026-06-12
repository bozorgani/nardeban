'use client';

import { useEffect, useState } from 'react';

/**
 * مدیریت PWA:
 *  ۱) ثبت Service Worker
 *  ۲) بنر «نسخه جدید» وقتی SW تازه‌ای آماده است
 *  ۳) بنر نصب اپ (beforeinstallprompt) — حداکثر یک‌بار در هفته نمایش
 */
export default function PWA() {
  const [waitingSW, setWaitingSW] = useState(null);
  const [installEvent, setInstallEvent] = useState(null);
  const [showInstall, setShowInstall] = useState(false);

  /* ---------- ثبت SW ---------- */
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return; // در dev مزاحم HMR نشود

    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        // SW جدید در انتظار؟
        if (reg.waiting) setWaitingSW(reg.waiting);
        reg.addEventListener('updatefound', () => {
          const sw = reg.installing;
          sw?.addEventListener('statechange', () => {
            if (sw.state === 'installed' && navigator.serviceWorker.controller) {
              setWaitingSW(sw);
            }
          });
        });
      })
      .catch(() => {});

    // وقتی SW جدید کنترل را گرفت، رفرش
    let refreshed = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshed) {
        refreshed = true;
        window.location.reload();
      }
    });
  }, []);

  /* ---------- پرامپت نصب ---------- */
  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault();
      setInstallEvent(e);
      // اگر اخیراً رد کرده، دوباره نشان نده (۷ روز)
      const dismissed = Number(localStorage.getItem('pwa_dismissed') || 0);
      if (Date.now() - dismissed > 7 * 24 * 3600 * 1000) {
        setShowInstall(true);
      }
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  const install = async () => {
    if (!installEvent) return;
    installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome !== 'accepted') {
      localStorage.setItem('pwa_dismissed', String(Date.now()));
    }
    setShowInstall(false);
    setInstallEvent(null);
  };

  const dismissInstall = () => {
    localStorage.setItem('pwa_dismissed', String(Date.now()));
    setShowInstall(false);
  };

  return (
    <>
      {/* بنر به‌روزرسانی */}
      {waitingSW && (
        <div className="fixed inset-x-3 top-3 z-[80] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3.5 shadow-xl">
          <span className="text-xl">🔄</span>
          <p className="flex-1 text-sm font-bold text-gray-800">نسخهٔ جدید نردبان آماده است</p>
          <button
            onClick={() => waitingSW.postMessage('SKIP_WAITING')}
            className="rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white"
          >
            به‌روزرسانی
          </button>
        </div>
      )}

      {/* بنر نصب */}
      {showInstall && (
        <div className="fixed inset-x-3 bottom-20 z-[80] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-xl md:bottom-6">
          <img src="/icons/icon-96.png" alt="نردبان" className="h-12 w-12 rounded-xl" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold text-gray-900">نصب اپلیکیشن نردبان</p>
            <p className="text-xs text-gray-400">سریع‌تر، بدون مرورگر، با پشتیبانی آفلاین</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <button onClick={install} className="rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white">
              نصب
            </button>
            <button onClick={dismissInstall} className="text-[10px] text-gray-400">
              بعداً
            </button>
          </div>
        </div>
      )}
    </>
  );
}
