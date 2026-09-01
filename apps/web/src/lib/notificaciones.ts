import { useQuery } from '@tanstack/react-query';
import { api } from './api';

export type TipoPendiente =
  | 'SOLICITUDES'
  | 'DECLARACIONES'
  | 'PAGOS'
  | 'EVENTOS_SIN_PUBLICAR'
  | 'EDICION_SIN_PROGRAMA'
  | 'MENSAJES_CONTACTO';

export interface Pendiente {
  tipo: TipoPendiente;
  cantidad: number;
  titulo: string;
  detalle: string;
  ruta: string;
  prioridad: number;
}

export interface Notificaciones {
  total: number;
  solicitudes: number;
  declaraciones: number;
  pendientes: Pendiente[];
}

/** Clave única, para invalidarla desde donde se resuelve un pendiente. */
export const CLAVE_NOTIFICACIONES = ['notificaciones'] as const;

/**
 * Pendientes de quien tiene la sesión abierta.
 * Se recarga sola cada minuto y al volver a la pestaña, para que el contador
 * refleje lo que llegó mientras el panel estaba abierto.
 */
export function useNotificaciones(activo = true) {
  return useQuery({
    queryKey: CLAVE_NOTIFICACIONES,
    queryFn: () => api.get<Notificaciones>('/notificaciones'),
    enabled: activo,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });
}
