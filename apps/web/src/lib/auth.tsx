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

/**
 * Acceso automático para desarrollo.
 *
 * Encerrar esto en `import.meta.env.DEV` no es cosmético: Vite sustituye esa
 * expresión por `false` literal al compilar, así que el empaquetador elimina
 * todo el bloque y las credenciales NO aparecen en el bundle de producción.
 * Hay una prueba que lo comprueba sobre el archivo compilado.
 */
function credencialesDeDesarrollo() {
  if (!import.meta.env.DEV) return null;
  if (sessionStorage.getItem('aemipn_sin_autologin')) return null;

  const email = import.meta.env.VITE_AUTOLOGIN_EMAIL;
  const password = import.meta.env.VITE_AUTOLOGIN_PASSWORD;
  if (!email || !password) return null;

  return { email, password } as { email: string; password: string };
}

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
          return;
        }

        // Sin cookie valida, en desarrollo se puede entrar solo.
        // El if envuelve todo a proposito: Vite sustituye import.meta.env.DEV
        // por `false` al compilar y el empaquetador elimina el bloque completo.
        if (import.meta.env.DEV) {
          const cred = credencialesDeDesarrollo();
          if (!cred || !vivo) return;

          const auto = await fetch('/api/auth/login', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cred),
          });
          if (!auto.ok) {
            console.warn('[dev] Acceso automatico fallido. Revisa apps/web/.env.local');
            return;
          }
          if (!vivo) return;
          const datosAuto = await auto.json();
          setAccessToken(datosAuto.accessToken);
          setUser(datosAuto.user);
          console.warn(`[dev] Sesion iniciada automaticamente como ${cred.email}.`);
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
    // Si no, el acceso automático volvería a entrar al recargar y "Salir"
    // parecería roto. Recargar la página lo reactiva.
    if (import.meta.env.DEV) sessionStorage.setItem('aemipn_sin_autologin', '1');
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
