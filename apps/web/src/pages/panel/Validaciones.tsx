import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { Area, Course } from '../../lib/types';
import { Cargando, ErrorAviso, Insignia } from '../../components/Estado';
import { Icono, hayIcono } from '../../components/Icono';
import { etiqueta, fmtFechaCorta, nombreCompleto } from '../../lib/format';
import { CLAVE_NOTIFICACIONES } from '../../lib/notificaciones';

interface Declaracion {
  id: string;
  anio: number;
  letra: string;
  status: 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';
  motivoRechazo: string | null;
  revisadaPor: string | null;
  notas: string | null;
  createdAt: string;
  member: {
    id: string; nombre: string; apellidoPaterno: string; apellidoMaterno: string | null;
    email: string; telefono: string | null; boleta: string | null; escuela: string | null;
  };
  course: Course & { area: Pick<Area, 'id' | 'nombre' | 'slug' | 'color'> | null };
}

/**
 * Cursos que la gente declaró y esperan visto bueno.
 * La API ya filtra por lo que quien mira puede resolver: un jefe de área solo
 * recibe lo suyo, así que aquí no hace falta volver a decidirlo.
 */
export function Validaciones() {
  const qc = useQueryClient();
  const [filtro, setFiltro] = useState('PENDIENTE');
  const [rechazando, setRechazando] = useState<string | null>(null);
  const [motivo, setMotivo] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['claims', filtro],
    queryFn: () => api.get<Declaracion[]>(`/claims${filtro ? `?status=${filtro}` : ''}`),
  });

  const refrescar = () => {
    qc.invalidateQueries({ queryKey: ['claims'] });
    qc.invalidateQueries({ queryKey: CLAVE_NOTIFICACIONES });
    qc.invalidateQueries({ queryKey: ['members'] });
    qc.invalidateQueries({ queryKey: ['areas'] });
  };

  const aprobar = useMutation({
    mutationFn: (id: string) => api.post(`/claims/${id}/aprobar`),
    onSuccess: refrescar,
  });

  const rechazar = useMutation({
    mutationFn: (id: string) => api.post(`/claims/${id}/rechazar`, { motivo }),
    onSuccess: () => {
      refrescar();
      setRechazando(null);
      setMotivo('');
    },
  });

  return (
    <>
      <div className="panel-encabezado">
        <div>
          <h1>Validación de cursos</h1>
          <p className="texto-suave" style={{ margin: 0 }}>
            Aprobar da acceso: la persona queda dentro del área del curso.
          </p>
        </div>
      </div>

      <div className="barra-filtros">
        <select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
          <option value="PENDIENTE">Por revisar</option>
          <option value="APROBADA">Aprobadas</option>
          <option value="RECHAZADA">Rechazadas</option>
          <option value="">Todas</option>
        </select>
        {data && <span className="texto-suave">{data.length} declaración(es)</span>}
      </div>

      {isLoading && <Cargando />}
      {error && <ErrorAviso error={error} />}
      {aprobar.error != null && <ErrorAviso error={aprobar.error} />}
      {rechazar.error != null && <ErrorAviso error={rechazar.error} />}

      {data?.length === 0 && (
        <div className="vacio">
          {filtro === 'PENDIENTE'
            ? 'No hay cursos esperando tu visto bueno.'
            : 'Nada con ese filtro.'}
        </div>
      )}

      <div className="pila">
        {data?.map((d) => (
          <article key={d.id} className="tarjeta">
            <div className="tarjeta-franja" style={{ background: d.course.area?.color ?? 'var(--guinda)' }} />
            <div className="tarjeta-cuerpo">
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <code style={{ fontWeight: 700, color: 'var(--guinda)', fontSize: '1.05rem' }}>
                  {d.course.codigo ?? '—'}_{d.anio}{d.letra}
                </code>
                <Insignia valor={d.status} texto={etiqueta(d.status)} />
                {d.course.area ? (
                  <span className="insignia" style={{ background: `${d.course.area.color}1f`, color: d.course.area.color ?? undefined }}>
                    {hayIcono(d.course.area.slug) && <Icono nombre={d.course.area.slug} />}
                    {d.course.area.nombre}
                  </span>
                ) : (
                  <span className="insignia">Transversal</span>
                )}
                <span className="texto-suave" style={{ marginLeft: 'auto', fontSize: '0.85rem' }}>
                  {fmtFechaCorta(d.createdAt)}
                </span>
              </div>

              <h3 style={{ marginTop: '0.6rem', marginBottom: '0.2rem', fontSize: '1.05rem' }}>
                {nombreCompleto(d.member)}
              </h3>
              <div className="texto-suave" style={{ fontSize: '0.88rem', marginBottom: '0.5rem' }}>
                {d.member.email}
                {d.member.telefono && ` · ${d.member.telefono}`}
                {d.member.boleta && ` · Boleta ${d.member.boleta}`}
                {d.member.escuela && ` · ${d.member.escuela}`}
              </div>

              <p style={{ fontSize: '0.93rem', marginBottom: '0.5rem' }}>
                Declara haber tomado <strong>{d.course.nombre}</strong>, generación {d.anio}{d.letra}.
              </p>
              {d.status === 'PENDIENTE' && (
                <p className="texto-suave" style={{ fontSize: '0.85rem' }}>
                  {d.course.kind === 'AREA' && d.course.area
                    ? 'Es el curso base del área: aprobarlo la integra a ' + d.course.area.nombre + '.'
                    : 'Es un taller: aprobarlo lo deja en su historial, pero no le abre el área.'}
                </p>
              )}
              {d.notas && (
                <p className="texto-suave" style={{ fontSize: '0.9rem' }}>{d.notas}</p>
              )}
              {d.motivoRechazo && (
                <p className="texto-suave" style={{ fontSize: '0.9rem' }}>
                  <strong>Motivo del rechazo:</strong> {d.motivoRechazo}
                </p>
              )}
              {d.revisadaPor && (
                <p className="texto-suave" style={{ fontSize: '0.82rem' }}>
                  Revisada por {d.revisadaPor}
                </p>
              )}

              {d.status === 'PENDIENTE' && (
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                  <button type="button" className="btn btn-verde btn-sm"
                    onClick={() => aprobar.mutate(d.id)} disabled={aprobar.isPending}>
                    {d.course.kind === 'AREA' && d.course.area
                      ? 'Aprobar y sumar a ' + d.course.area.nombre
                      : 'Aprobar'}
                  </button>
                  <button type="button" className="btn btn-borde btn-sm"
                    onClick={() => setRechazando(rechazando === d.id ? null : d.id)}>
                    Rechazar
                  </button>
                </div>
              )}

              {rechazando === d.id && (
                <div style={{ marginTop: '0.75rem' }}>
                  <div className="campo">
                    <label htmlFor={`m-${d.id}`}>Motivo</label>
                    <input id={`m-${d.id}`} value={motivo} placeholder="No aparece en las listas de esa generación."
                      onChange={(e) => setMotivo(e.target.value)} />
                  </div>
                  <button type="button" className="btn btn-peligro btn-sm"
                    disabled={!motivo.trim() || rechazar.isPending}
                    onClick={() => rechazar.mutate(d.id)}>
                    Confirmar rechazo
                  </button>
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
