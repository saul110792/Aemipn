import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api, setAccessToken } from './api';
import type { SessionUser } from './types';

interface AuthValue {
  user: SessionUser | null;
  cargando: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** true si el usuario puede administrar (mesa directiva o apoyo). */
  esAdmin: boolean;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [cargando, setCargando] = useState(true);

  // Al montar intentamos recuperar la sesion con la cookie de refresh.
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const res = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
        if (res.ok && vivo) {
          const data = await res.json();
          setAccessToken(data.accessToken);
          setUser(data.user);
        }
      } catch {
        // Sin sesion previa: se navega como visitante.
      } finally {
        if (vivo) setCargando(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.post<{ accessToken: string; user: SessionUser }>('/auth/login', {
      email,
      password,
    });
    setAccessToken(data.accessToken);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    await api.post('/auth/logout').catch(() => undefined);
    setAccessToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      cargando,
      login,
      logout,
      esAdmin: user?.role === 'ADMIN' || user?.role === 'STAFF',
    }),
    [user, cargando, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
