import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Cargando, ErrorAviso } from './Estado';
import { fmtFechaHora, nombreCompleto } from '../lib/format';

export type EstadoAsistencia = 'PRESENTE' | 'TARDE' | 'JUSTIFICADO' | 'AUSENTE';

/** El orden importa: es el que se recorre con el pulgar en la app. */
const ESTADOS: { valor: EstadoAsistencia; corto: string; titulo: string }[] = [
  { valor: 'PRESENTE', corto: 'Sí', titulo: 'Presente' },
  { valor: 'TARDE', corto: 'Tarde', titulo: 'Llegó tarde' },
  { valor: 'JUSTIFICADO', corto: 'Just.', titulo: 'Falta justificada' },
  { valor: 'AUSENTE', corto: 'No', titulo: 'Ausente' },
];

interface Renglon {
  member: { id: string; nombre: string; apellidoPaterno: string; apellidoMaterno: string | null; fotoUrl: string | null };
  statusInscripcion: string;
  estado: EstadoAsistencia | null;
  nota: string | null;
  registradaEn: string | null;
  registradaPor: { id: string; nombre: string; apellidoPaterno: string } | null;
  /// Solo viene cuando la marca se tomó sin señal y subió mucho después.
  subidaEn: string | null;
}

interface Respuesta {
  actividad: { id: string; titulo: string; fechaInicio: string };
  puedeTomarLista: boolean;
  lista: Renglon[];
}

/**
 * Pasar lista de una sesión.
 *
 * Se guarda de un solo envío, no marca por marca. Así es como se pasa lista de
 * verdad —se recorre al grupo una vez y se manda todo junto— y es también lo
 * que la app va a necesitar: una sola acción en la cola en vez de treinta.
 */
export function PasarLista({ actividadId }: { actividadId: string }) {
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['asistencia', actividadId],
    queryFn: () => api.get<Respuesta>(`/asistencias/actividad/${actividadId}`),
  });

  // Borrador local: se edita aquí y se manda al final.
  const [borrador, setBorrador] = useState<Record<string, EstadoAsistencia>>({});

  useEffect(() => {
    if (!data) return;
    setBorrador(
      Object.fromEntries(
        data.lista.filter((r) => r.estado).map((r) => [r.member.id, r.estado as EstadoAsistencia]),
      ),
    );
  }, [data]);

  const guardar = useMutation({
    mutationFn: () =>
      api.put(`/asistencias/actividad/${actividadId}`, {
        marcas: Object.entries(borrador).map(([memberId, estado]) => ({ memberId, estado })),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['asistencia', actividadId] }),
  });

  const conteo = useMemo(() => {
    const c: Record<string, number> = {};
    for (const e of Object.values(borrador)) c[e] = (c[e] ?? 0) + 1;
    return c;
  }, [borrador]);

  const sinMarcar = (data?.lista.length ?? 0) - Object.keys(borrador).length;

  // Sin cambios no hay nada que guardar; comparar contra lo que trajo el
  // servidor evita un botón que siempre parece tener algo pendiente.
  const hayCambios = useMemo(() => {
    if (!data) return false;
    const original = Object.fromEntries(
      data.lista.filter((r) => r.estado).map((r) => [r.member.id, r.estado]),
    );
    const claves = new Set([...Object.keys(original), ...Object.keys(borrador)]);
    return [...claves].some((k) => original[k] !== borrador[k]);
  }, [data, borrador]);

  if (isLoading) return <Cargando />;
  if (error) return <ErrorAviso error={error} />;
  if (!data) return null;

  if (!data.puedeTomarLista) {
    const mia = data.lista[0];
    return (
      <p className="texto-suave" style={{ margin: 0, fontSize: '.9rem' }}>
        {mia?.estado
          ? `Quedaste como ${ESTADOS.find((e) => e.valor === mia.estado)?.titulo.toLowerCase()} en esta sesión.`
          : 'Todavía no se ha pasado lista de esta sesión.'}
      </p>
    );
  }

  if (data.lista.length === 0) {
    return (
      <p className="texto-suave" style={{ margin: 0, fontSize: '.9rem' }}>
        No hay nadie inscrito en la edición, así que no hay lista que pasar.
      </p>
    );
  }

  const marcarTodos = (estado: EstadoAsistencia) =>
    setBorrador(Object.fromEntries(data.lista.map((r) => [r.member.id, estado])));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.85rem' }}>
      <div style={{ display: 'flex', gap: '.6rem', alignItems: 'baseline', flexWrap: 'wrap' }}>
        <strong style={{ fontSize: '.95rem' }}>Lista de {data.actividad.titulo}</strong>
        <span className="texto-suave" style={{ fontSize: '.83rem' }}>
          {fmtFechaHora(data.actividad.fechaInicio)}
        </span>
      </div>

      <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <span className="texto-suave" style={{ fontSize: '.82rem' }}>Marcar a todos:</span>
        <button type="button" className="btn btn-borde btn-sm" onClick={() => marcarTodos('PRESENTE')}>
          Presentes
        </button>
        <button type="button" className="btn btn-borde btn-sm" onClick={() => marcarTodos('AUSENTE')}>
          Ausentes
        </button>
        {Object.keys(borrador).length > 0 && (
          <button type="button" className="btn btn-borde btn-sm" onClick={() => setBorrador({})}>
            Limpiar
          </button>
        )}
      </div>

      <div className="tabla-envoltura">
        <table>
          <thead>
            <tr>
              <th>Persona</th>
              {ESTADOS.map((e) => (
                <th key={e.valor} style={{ textAlign: 'center' }} title={e.titulo}>
                  {e.corto}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.lista.map((r) => (
              <tr key={r.member.id}>
                <td>
                  {nombreCompleto(r.member)}
                  {r.subidaEn && (
                    // Sin esto, una lista tomada en el cerro y subida por la
                    // noche parecería capturada por la noche.
                    <div className="texto-suave" style={{ fontSize: '.76rem' }}>
                      Tomada sin señal · subió el {fmtFechaHora(r.subidaEn)}
                    </div>
                  )}
                  {r.nota && (
                    <div className="texto-suave" style={{ fontSize: '.78rem' }}>{r.nota}</div>
                  )}
                </td>
                {ESTADOS.map((e) => (
                  <td key={e.valor} style={{ textAlign: 'center' }}>
                    <input
                      type="radio"
                      name={`asis-${r.member.id}`}
                      aria-label={`${nombreCompleto(r.member)}: ${e.titulo}`}
                      checked={borrador[r.member.id] === e.valor}
                      onChange={() => setBorrador((v) => ({ ...v, [r.member.id]: e.valor }))}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {guardar.error != null && <ErrorAviso error={guardar.error} />}

      <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn btn-verde"
          disabled={!hayCambios || guardar.isPending}
          onClick={() => guardar.mutate()}
        >
          {guardar.isPending ? 'Guardando…' : 'Guardar lista'}
        </button>

        <span className="texto-suave" style={{ fontSize: '.85rem' }}>
          {ESTADOS.filter((e) => conteo[e.valor]).map((e) => `${conteo[e.valor]} ${e.titulo.toLowerCase()}`).join(' · ')}
          {sinMarcar > 0 && (conteo.PRESENTE || conteo.AUSENTE ? ' · ' : '')}
          {sinMarcar > 0 && `${sinMarcar} sin marcar`}
        </span>

        {guardar.isSuccess && !hayCambios && (
          <span className="insignia insignia-verde">Guardada</span>
        )}
      </div>
    </div>
  );
}
