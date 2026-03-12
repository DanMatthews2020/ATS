'use client';

import {
  createContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import type { AuthContextValue, User } from '@/types';
import { MOCK_USER } from '@/lib/constants';

export const AuthContext = createContext<AuthContextValue | null>(null);

const SESSION_KEY = 'teamtalent_session';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (stored) {
        setUser(JSON.parse(stored) as User);
      }
    } catch {
      // sessionStorage not available (e.g. SSR context)
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(
    async (email: string, _password: string): Promise<void> => {
      setIsLoading(true);
      // Simulate network latency
      await new Promise<void>((resolve) => setTimeout(resolve, 700));
      const authedUser: User = { ...MOCK_USER, email };
      setUser(authedUser);
      try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(authedUser));
      } catch {
        // sessionStorage write failed — silently continue
      }
      setIsLoading(false);
    },
    [],
  );

  const logout = useCallback((): void => {
    setUser(null);
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // sessionStorage not available
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}
