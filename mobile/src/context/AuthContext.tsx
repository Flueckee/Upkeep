import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getToken, setToken, removeToken } from '../services/storage';
import { getMe } from '../services/authApi';
import { User } from '../types';
import { useTheme } from './ThemeContext';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Merge a partial update into the cached user (e.g. after avatar upload). */
  updateUser: (patch: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { setPrimaryColor } = useTheme();

  useEffect(() => {
    (async () => {
      try {
        const stored = await getToken();
        if (stored) {
          const me = await getMe();
          setUser(me);
          if (me.primary_color) {
            setPrimaryColor(me.primary_color);
          }
        }
      } catch {
        await removeToken();
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (token: string) => {
    await setToken(token);
    const me = await getMe();
    setUser(me);
    if (me.primary_color) {
      setPrimaryColor(me.primary_color);
    }
  }, [setPrimaryColor]);

  const logout = useCallback(async () => {
    await removeToken();
    setUser(null);
  }, []);

  const updateUser = useCallback((patch: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...patch } : prev);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
