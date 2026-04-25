'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { api, setAuthTokens as setAxiosTokens, clearAuthTokens as clearAxiosTokens } from '@/lib/axios';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'VIEWER';
}

interface AuthState {
  accessToken: string | null;
  expiresAt: number | null;
  user: User | null;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setTokens: (accessToken: string, refreshToken: string, user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    accessToken: null,
    expiresAt: null,
    user: null,
  });

  const setTokens = useCallback(
    (accessToken: string, refreshToken: string, user: User) => {
      const expiresAt = Date.now() + 14 * 60 * 1000; // 14 min (1 min before 15 min expiry)
      setState({ accessToken, expiresAt, user });
      localStorage.setItem('refreshToken', refreshToken);
    },
    [],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.post<{
        accessToken: string;
        refreshToken: string;
        user: User;
      }>('/auth/login', { email, password });
      const expiresAt = Date.now() + 14 * 60 * 1000;
      setState({ accessToken: res.data.accessToken, expiresAt, user: res.data.user });
      setAxiosTokens(res.data.accessToken, expiresAt);
      localStorage.setItem('refreshToken', res.data.refreshToken);
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setState({ accessToken: null, expiresAt: null, user: null });
      clearAxiosTokens();
      localStorage.removeItem('refreshToken');
    }
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, setTokens }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
