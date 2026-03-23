'use client';

import {
  createContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import { authApi } from '@/lib/api';
import type { ApiUser } from '@/lib/api';
import type { AuthContextValue, User } from '@/types';

export const AuthContext = createContext<AuthContextValue | null>(null);

// Maps the backend ApiUser shape → frontend User type
function toUser(apiUser: ApiUser): User {
  return {
    id: apiUser.id,
    email: apiUser.email,
    name: `${apiUser.firstName} ${apiUser.lastName}`,
    role: apiUser.role,
    avatarUrl: apiUser.avatarUrl ?? '',
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: silently restore session via httpOnly cookie → GET /auth/me
  useEffect(() => {
    authApi
      .getMe()
      .then(({ user: apiUser }) => setUser(toUser(apiUser)))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    try {
      const { user: apiUser } = await authApi.login(email, password);
      setUser(toUser(apiUser));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback((): void => {
    // Fire-and-forget: clear server-side cookies then wipe local state
    authApi.logout().catch(() => {}).finally(() => setUser(null));
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}
