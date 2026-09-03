import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import type { SiteSettings } from './types';

/**
 * Aplica el tema elegido por el admin (Contenido > Estilo) a todo el sitio,
 * público y panel, escribiendo data-tema en <html> para que lo lean las
 * variables CSS de styles.css. "clasico" es el guinda institucional y no
 * necesita atributo, pero se deja explícito para no depender del valor previo.
 */
export function useAplicarTema() {
  const { data } = useQuery({
    queryKey: ['public', 'configuracion'],
    queryFn: () => api.get<SiteSettings>('/public/configuracion'),
  });

  useEffect(() => {
    document.documentElement.dataset.tema = data?.tema ?? 'clasico';
  }, [data?.tema]);
}
