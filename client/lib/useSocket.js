'use client';

import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { API_URL } from './api';

/**
 * مدیریت اتصال سوکت (F11)
 * ----------------------------------------------------------------------------
 * قبلاً sharedSocket یک‌بار باز می‌شد و هرگز بسته نمی‌شد حتی وقتی هیچ شنونده‌ای
 * نبود؛ refCount صرفاً شمرده می‌شد بدون اقدام. مشکلات:
 *   - مصرف باتری/دیتای موبایل وقتی کاربر در /about یا 404 است و چت نیاز ندارد
 *   - keepalive socket حتی روی tab مخفی → نگه‌داشتن CPU
 *
 * سیاست جدید:
 *   ۱) وقتی refCount روی صفر می‌رسد، یک «grace period» شروع می‌شود
 *      (DISCONNECT_GRACE_MS) — اگر در این بازه کسی دوباره subscribe کرد،
 *      هیچ disconnectی رخ نمی‌دهد (تجربهٔ کاربر روان می‌ماند).
 *   ۲) اگر refCount صفر باقی ماند، سوکت بسته می‌شود تا اتصال آزاد گردد.
 *   ۳) روی hidden شدن tab، گرس کوتاه‌تر می‌شود (HIDDEN_GRACE_MS) تا روی موبایل
 *      که کاربر سریع بین tab سوییچ می‌کند ولی شنونده‌ای نمی‌ماند، زودتر آزاد شود.
 *   ۴) خروج کامل از حساب (destroySocket) مستقل از این منطق سوکت را قطعاً می‌بندد.
 */

const DISCONNECT_GRACE_MS = 30_000; // ۳۰ ثانیه بدون شنونده → close
const HIDDEN_GRACE_MS = 60_000; // اگر tab مخفی است → ۶۰ ثانیه

let sharedSocket = null;
let refCount = 0;
let closeTimer = null;
let hiddenListenerInstalled = false;

function clearCloseTimer() {
  if (closeTimer) {
    clearTimeout(closeTimer);
    closeTimer = null;
  }
}

function scheduleClose(ms) {
  clearCloseTimer();
  if (!sharedSocket) return;
  closeTimer = setTimeout(() => {
    closeTimer = null;
    // دوبار چک: شاید بین زمان‌بندی و اجرا کسی subscribe کرده
    if (refCount === 0 && sharedSocket) {
      sharedSocket.disconnect();
      sharedSocket = null;
    }
  }, ms);
}

function ensureHiddenListener() {
  if (hiddenListenerInstalled || typeof document === 'undefined') return;
  hiddenListenerInstalled = true;
  document.addEventListener('visibilitychange', () => {
    if (refCount > 0) return; // شنونده هست → کاری نکن
    if (document.visibilityState === 'hidden') {
      // اگر بدون شنونده روی tab مخفی هستیم، زودتر ببند
      scheduleClose(HIDDEN_GRACE_MS);
    } else {
      // tab visible شد، تصمیم disconnect را به همان منطق refCount بسپار
      // (اگر هنوز شنونده‌ای نیست، grace استاندارد ادامه می‌یابد)
    }
  });
}

export function getSocket() {
  if (!sharedSocket) {
    // احراز هویت سوکت با کوکی HttpOnly انجام می‌شود (SEC-04):
    // withCredentials=true باعث ارسال کوکی در handshake می‌شود و سرور آن را می‌خواند.
    sharedSocket = io(API_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnectionDelay: 2000,
    });
  }
  ensureHiddenListener();
  // اگر در حال grace بود و کسی دوباره socket خواست، grace را لغو کن
  clearCloseTimer();
  return sharedSocket;
}

export function releaseSocket() {
  refCount = Math.max(0, refCount - 1);
  if (refCount === 0 && sharedSocket) {
    // F11: شنونده‌ای نمانده — grace period کوتاه و سپس close
    scheduleClose(DISCONNECT_GRACE_MS);
  }
}

export function destroySocket() {
  clearCloseTimer();
  if (sharedSocket) {
    sharedSocket.disconnect();
    sharedSocket = null;
    refCount = 0;
  }
}

/**
 * هوک اتصال سوکت — listeners را ثبت و هنگام unmount پاک می‌کند.
 * @param {Object<string, Function>} handlers  نگاشت رویداد → هندلر
 * @param {boolean} enabled
 */
export function useSocket(handlers = {}, enabled = true) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!enabled) return;
    const socket = getSocket();
    if (!socket) return;
    refCount += 1;

    const entries = Object.keys(handlersRef.current).map((event) => {
      const fn = (...args) => handlersRef.current[event]?.(...args);
      socket.on(event, fn);
      return [event, fn];
    });

    return () => {
      entries.forEach(([event, fn]) => socket.off(event, fn));
      releaseSocket();
    };
  }, [enabled]);

  return enabled ? getSocket() : null;
}
