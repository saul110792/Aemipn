/**
 * Cliente HTTP unico contra la API.
 * Guarda el access token en memoria (no en localStorage) y renueva
 * automaticamente con la cookie httpOnly de refresh cuando expira.
 */

let accessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};
export const getAccessToken = () => accessToken;

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public detalles?: { campo: string; mensaje: string }[],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type Options = Omit<RequestInit, 'body'> & { body?: unknown; skipRefresh?: boolean };

async function request<T>(path: string, options: Options = {}): Promise<T> {
  const { body, skipRefresh, headers, ...rest } = options;

  const res = await fetch(`/api${path}`, {
    ...rest,
    credentials: 'include',
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  // Token vencido: renovamos una sola vez y reintentamos.
  if (res.status === 401 && !skipRefresh && path !== '/auth/refresh') {
    const renovado = await tryRefresh();
    if (renovado) return request<T>(path, { ...options, skipRefresh: true });
  }

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => ({ error: 'Respuesta no valida del servidor' }));

  if (!res.ok) throw new ApiError(res.status, data.error ?? 'Error inesperado', data.detalles);
  return data as T;
}

async function tryRefresh(): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
    if (!res.ok) return false;
    const data = await res.json();
    setAccessToken(data.accessToken);
    return true;
  } catch {
    return false;
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  refresh: tryRefresh,
};
