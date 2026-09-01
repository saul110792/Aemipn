import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Evento } from '../lib/types';
import { Icono, hayIcono } from './Icono';
import { Insignia } from './Estado';
import { etiqueta, fmtHora } from '../lib/format';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import { descargarICS } from '../lib/ics';

/** Tarjeta de evento con su bloque de fecha, modalidad y como llegar. */
export function TarjetaEvento({ evento, mostrarVisibilidad = false }: { evento: Evento; mostrarVisibilidad?: boolean }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const inicio = new Date(evento.fechaInicio);
  const color = evento.area?.color ?? 'var(--guinda)';
  const enLinea = evento.modalidad === 'EN_LINEA' || evento.modalidad === 'HIBRIDA';
  const presencial = evento.modalidad === 'PRESENCIAL' || evento.modalidad === 'HIBRIDA';
  // El sitio público trae los eventos de /public/eventos, que nunca calcula
  // voyAsistir/rsvpCount (no hay sesión ahí). Solo el panel (/events) lo trae,
  // así que el botón de confirmar solo aparece donde sí puede reflejar su estado.
  const soportaRsvp = evento.rsvpCount !== undefined;

  const asistire = useMutation({
    mutationFn: () =>
      evento.voyAsistir ? api.delete(`/events/${evento.id}/asistire`) : api.post(`/events/${evento.id}/asistire`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events'] });
      qc.invalidateQueries({ queryKey: ['public'] });
    },
  });

  return (
    <article className="tarjeta">
      <div className="tarjeta-franja" style={{ background: color }} />
      <div className="tarjeta-cuerpo">
        <div className="evento">
          <div className="evento-fecha" style={{ background: color }}>
            <span className="dia">{inicio.getDate()}</span>
            <span className="mes">
              {inicio.toLocaleDateString('es-MX', { month: 'short' }).replace('.', '')}
            </span>
            <span className="evento-anio">{inicio.getFullYear()}</span>
          </div>

          <div>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
              <Insignia valor={evento.kind} texto={etiqueta(evento.kind)} />
              {evento.area && (
                <span className="insignia" style={{ background: `${evento.area.color}1f`, color: evento.area.color ?? undefined }}>
                  {hayIcono(evento.area.slug) && <Icono nombre={evento.area.slug} />}
                  {evento.area.nombre}
                </span>
              )}
              {mostrarVisibilidad && evento.visibilidad && evento.visibilidad !== 'PUBLICO' && (
                <Insignia valor={evento.visibilidad} texto={etiqueta(evento.visibilidad)} />
              )}
              {mostrarVisibilidad && evento.publicado === false && (
                <span className="insignia insignia-ambar">Sin publicar</span>
              )}
            </div>

            <h3 style={{ marginBottom: 0, fontSize: '1.1rem' }}>{evento.titulo}</h3>

            <div className="evento-meta">
              <span>
                <Icono nombre="calendario" />
                {fmtHora(evento.fechaInicio)}
                {evento.fechaFin && ` – ${fmtHora(evento.fechaFin)}`}
              </span>
              {presencial && evento.lugar && (
                <span>
                  <Icono nombre="lugar" />
                  {evento.lugar}
                </span>
              )}
              {enLinea && evento.urlVideoconferencia && (
                <span>
                  <Icono nombre="video" />
                  <a href={evento.urlVideoconferencia} target="_blank" rel="noopener noreferrer">
                    Entrar a la videoconferencia
                  </a>
                </span>
              )}
              {evento.cupo != null && <span>Cupo {evento.cupo}</span>}
            </div>

            {evento.descripcion && (
              <p className="texto-suave" style={{ fontSize: '0.93rem', marginBottom: evento.registroUrl ? '0.75rem' : 0 }}>
                {evento.descripcion}
              </p>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginTop: '0.5rem' }}>
              {evento.registroUrl && (
                <a href={evento.registroUrl} target="_blank" rel="noopener noreferrer" className="btn btn-sm">
                  Registrarme
                </a>
              )}

              {user && soportaRsvp && (
                <button
                  type="button"
                  className={evento.voyAsistir ? 'btn btn-verde btn-sm' : 'btn btn-borde btn-sm'}
                  disabled={asistire.isPending}
                  onClick={() => asistire.mutate()}
                >
                  <Icono nombre="solicitudes" />
                  {evento.voyAsistir ? 'Voy a asistir' : 'Confirmar asistencia'}
                </button>
              )}

              <button
                type="button"
                className="btn btn-borde btn-sm"
                onClick={() =>
                  descargarICS({
                    titulo: evento.titulo,
                    descripcion: evento.descripcion,
                    lugar: presencial ? evento.lugar : evento.urlVideoconferencia,
                    inicio: evento.fechaInicio,
                    fin: evento.fechaFin,
                  })
                }
              >
                <Icono nombre="calendario" /> Agregar a mi calendario
              </button>

              {(evento.rsvpCount ?? 0) > 0 && (
                <span className="texto-suave" style={{ fontSize: '0.82rem' }}>
                  {evento.rsvpCount} {evento.rsvpCount === 1 ? 'persona va' : 'personas van'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
