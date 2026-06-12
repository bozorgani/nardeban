'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from './api';

const AuthContext = createContext(null);

// کوکی توکن — برای اینکه SSR (صفحه جزئیات آگهی) هم بتواند با هویت کاربر fetch کند
function setTokenCookie(token) {
  if (typeof document === 'undefined') return;
  if (token) {
    document.cookie = `nardeban_token=${token}; path=/; max-age=${30 * 24 * 3600}; SameSite=Lax`;
  } else {
    document.cookie = 'nardeban_token=; path=/; max-age=0';
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const token = localStorage.getItem('nardeban_token');
      if (!token) return setUser(null);
      setTokenCookie(token); // همگام‌سازی کوکی برای SSR
      const { user } = await api('/auth/me');
      setUser(user);
    } catch {
      localStorage.removeItem('nardeban_token');
      setTokenCookie(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = (token, userData) => {
    localStorage.setItem('nardeban_token', token);
    setTokenCookie(token);
    setUser(userData);
  };

  const logout = async () => {
    localStorage.removeItem('nardeban_token');
    setTokenCookie(null);
    setUser(null);
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
