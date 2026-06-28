'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from './api';
import { useToast } from '../components/Toast';

const AuthContext = createContext(null);

// توکن در کوکی HttpOnly سمت سرور ست می‌شود (SEC-04) — دیگر در localStorage یا
// کوکی قابل‌خواندن با JS نگهداری نمی‌شود. کلاینت فقط با /auth/me وضعیت را می‌گیرد.

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast(); // ToastProvider بیرون از AuthProvider در layout قرار دارد

  const refresh = useCallback(async () => {
    try {
      // کوکی HttpOnly خودکار ارسال می‌شود؛ اگر معتبر بود کاربر برمی‌گردد.
      const { user } = await api('/auth/me');
      setUser(user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // احراز هویت برای first paint بحرانی نیست؛ آن را بعد از اولین رنگ‌آمیزی
    // (idle/timeout) شروع می‌کنیم تا parse + hydration اولیه سبک‌تر شود.
    let cancelled = false;
    const run = () => {
      if (!cancelled) refresh();
    };
    const id = window.requestIdleCallback
      ? window.requestIdleCallback(run, { timeout: 1200 })
      : setTimeout(run, 250);
    return () => {
      cancelled = true;
      if (window.cancelIdleCallback && typeof id === 'number') {
        try { window.cancelIdleCallback(id); } catch { clearTimeout(id); }
      } else {
        clearTimeout(id);
      }
    };
  }, [refresh]);

  // login: سرور قبلاً کوکی را ست کرده؛ اینجا وضعیت UI را به‌روز می‌کنیم.
  // (پارامتر token برای سازگاری امضای قبلی نگه داشته شده ولی استفاده نمی‌شود.)
  const login = (_token, userData) => {
    // ابتدا با دادهٔ verify (سریع) UI را به‌روز می‌کنیم تا کاربر منتظر نماند،
    setUser(userData);
    // سپس refresh می‌زنیم تا پروفایل کامل (favorites/role/city) از /auth/me بیاید.
    // verify فقط زیرمجموعه‌ای از فیلدها را برمی‌گرداند؛ بدون این، نشان‌شده‌ها و
    // دسترسی ادمین تا رفرش بعدی صفحه ناقص می‌مانند.
    refresh();
    toast?.success(
      userData?.name?.trim()
        ? `خوش آمدید، ${userData.name} 👋`
        : 'خوش آمدید 👋',
      { title: 'ورود موفق' }
    );
  };

  // logout عادی فقط کوکی همین دستگاه را پاک می‌کند.
  // logout({ all: true }) → /auth/logout-all که tokenVersion را +۱ و همهٔ
  // نشست‌های فعال روی همهٔ دستگاه‌ها را باطل می‌کند (برای «گوشی‌ام گم شد»).
  const logout = async (opts = {}) => {
    try {
      await api(opts.all ? '/auth/logout-all' : '/auth/logout', { method: 'POST' });
    } catch {
      /* ignore */
    }
    setUser(null);
    toast?.info(
      opts.all
        ? 'از همهٔ دستگاه‌ها خارج شدید 🔒'
        : 'از حساب خود خارج شدید — به امید دیدار 👋'
    );
    // 🔒 پاک‌سازی کش صفحات در Service Worker تا صفحات احراز‌شدهٔ این کاربر
    // به کاربر بعدی روی همین دستگاه نشت نکند (نشت داده بین‌کاربری).
    try {
      navigator.serviceWorker?.controller?.postMessage('CLEAR_SESSION');
    } catch {
      /* ignore */
    }
    // بستن اتصال real-time
    try {
      const { destroySocket } = await import('./useSocket');
      destroySocket();
    } catch {
      /* ignore */
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
