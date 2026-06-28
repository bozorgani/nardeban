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
    refresh();
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

  const logout = async () => {
    try {
      await api('/auth/logout', { method: 'POST' }); // پاک‌کردن کوکی HttpOnly در سرور
    } catch {
      /* ignore */
    }
    setUser(null);
    toast?.info('از حساب خود خارج شدید — به امید دیدار 👋');
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
