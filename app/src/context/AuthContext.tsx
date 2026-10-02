import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { clearToken, getToken, setToken } from '../lib/storage';
import type { LoginResponse, User } from '../types/api';
import { unregisterCurrentPushToken } from '../lib/pushNotifications';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  establishSession: (session: LoginResponse) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: React.PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const { data } = await api.get<User>('/me');
    setUser(data);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        if (await getToken()) await refreshUser();
      } catch {
        await clearToken();
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshUser]);

  const establishSession = useCallback(async (session: LoginResponse) => {
    await setToken(session.token);
    try {
      await refreshUser();
    } catch {
      setUser(session.user);
    }
  }, [refreshUser]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data } = await api.post<LoginResponse>('/login', {
      email: email.trim().toLowerCase(),
      password: password,
    });
    await establishSession(data);
  }, [establishSession]);

  const signOut = useCallback(async () => {
    try {
      await unregisterCurrentPushToken();
    } catch {
      // Signing out locally must still succeed when the server is unavailable.
    }
    await clearToken();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, establishSession, signIn, signOut, refreshUser }),
    [user, loading, establishSession, signIn, signOut, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
