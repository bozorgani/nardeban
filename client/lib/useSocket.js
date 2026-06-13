'use client';

import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { API_URL, getToken } from './api';

// یک اتصال سراسری مشترک بین همه کامپوننت‌ها (هدر + صفحه چت)
let sharedSocket = null;
let refCount = 0;

export function getSocket() {
  if (!sharedSocket) {
    const token = getToken();
    if (!token) return null;
    // حالت یکپارچه: Socket.io روی همان origin صفحات (پورت ۳۰۰۰).
    // API_URL در مرورگر خالی است → undefined → socket.io به همان origin وصل می‌شود.
    const uri = API_URL || undefined;
    sharedSocket = io(uri, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionDelay: 2000,
    });
  }
  return sharedSocket;
}

export function releaseSocket() {
  refCount = Math.max(0, refCount - 1);
  // اتصال را باز نگه می‌داریم تا نوتیف هدر کار کند؛
  // فقط هنگام خروج از حساب کامل بسته می‌شود (در logout).
}

export function destroySocket() {
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
