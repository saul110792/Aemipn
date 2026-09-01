import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { CLAVE_NOTIFICACIONES } from '../../lib/notificaciones';
import type { ContactMessage } from '../../lib/types';
import { Cargando, ErrorAviso } from '../../components/Estado';
import { fmtFechaHora } from '../../lib/format';

/**
 * Mensajes del formulario público "Contáctanos".
 * Un mensaje sin área es de la mesa directiva; con área, de quien la
 * encabeza — la API ya filtra qué le toca ver a cada quien.
 */
export function MensajesContacto() {
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['contacto'],
    queryFn: () => api.get<ContactMessage[]>('/contacto'),
  });

  const marcarLeido = useMutation({
    mutationFn: (id: string) => api.patch(`/contacto/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacto'] });
      qc.invalidateQueries({ queryKey: CLAVE_NOTIFICACIONES });
    },
  });

  return (
    <>
      <div className="panel-encabezado">
        <div>
          <h1>Mensajes de contacto</h1>
          <p className="texto-suave" style={{ margin: 0 }}>
            Lo que llega por «Contáctanos» del sitio público, dirigido a la mesa directiva o a un
            área en particular.
          </p>
        </div>
      </div>

      {isLoading && <Cargando />}
      {error && <ErrorAviso error={error} />}
      {marcarLeido.error != null && <ErrorAviso error={marcarLeido.error} />}

      {data?.length === 0 && <div className="vacio">Todavía no hay mensajes.</div>}

      <div className="pila">
        {data?.map((m) => (
          <article key={m.id} className="tarjeta" style={{ opacity: m.leidoEn ? 0.7 : 1 }}>
            <div className="tarjeta-cuerpo">
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0 }}>{m.nombre}</h3>
                <span
                  className="insignia"
                  style={m.area ? { background: `${m.area.color ?? '#611232'}1f`, color: m.area.color ?? undefined } : undefined}
                >
                  {m.area?.nombre ?? 'Mesa directiva'}
                </span>
                {!m.leidoEn && <span className="insignia insignia-ambar">Sin leer</span>}
                <span className="texto-suave" style={{ marginLeft: 'auto', fontSize: '0.85rem' }}>
                  {fmtFechaHora(m.createdAt)}
                </span>
              </div>

              <div className="texto-suave" style={{ fontSize: '0.9rem', margin: '0.5rem 0' }}>
                <a href={`mailto:${m.email}`}>{m.email}</a>
                {m.telefono && ` · ${m.telefono}`}
              </div>

              <p style={{ margin: '0.5rem 0', whiteSpace: 'pre-wrap' }}>{m.mensaje}</p>

              <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.75rem' }}>
                <a href={`mailto:${m.email}`} className="btn btn-borde btn-sm">
                  Responder por correo
                </a>
                {!m.leidoEn && (
                  <button
                    type="button"
                    className="btn btn-borde btn-sm"
                    disabled={marcarLeido.isPending}
                    onClick={() => marcarLeido.mutate(m.id)}
                  >
                    Marcar como leído
                  </button>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
