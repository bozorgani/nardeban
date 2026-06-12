'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const token = localStorage.getItem('nardeban_token');
      if (!token) return setUser(null);
      const { user } = await api('/auth/me');
      setUser(user);
    } catch {
      localStorage.removeItem('nardeban_token');
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
    setUser(userData);
  };

  const logout = async () => {
    localStorage.removeItem('nardeban_token');
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
