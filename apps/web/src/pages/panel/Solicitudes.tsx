import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { MembershipApplication } from '../../lib/types';
import { Cargando, ErrorAviso, Insignia } from '../../components/Estado';
import { etiqueta, fmtFechaCorta } from '../../lib/format';

export function Solicitudes() {
  const qc = useQueryClient();
  const [filtro, setFiltro] = useState('NUEVA');
  const [rechazando, setRechazando] = useState<string | null>(null);
  const [motivo, setMotivo] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['applications', filtro],
    queryFn: () => api.get<MembershipApplication[]>(`/applications${filtro ? `?status=${filtro}` : ''}`),
  });

  const refrescar = () => {
    qc.invalidateQueries({ queryKey: ['applications'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
    qc.invalidateQueries({ queryKey: ['members'] });
  };

  const aceptar = useMutation({
    mutationFn: (id: string) => api.post(`/applications/${id}/aceptar`),
    onSuccess: refrescar,
  });

  const rechazar = useMutation({
    mutationFn: (id: string) => api.post(`/applications/${id}/rechazar`, { motivo }),
    onSuccess: () => {
      refrescar();
      setRechazando(null);
      setMotivo('');
    },
  });

  return (
    <>
      <div className="panel-encabezado">
        <h1>Solicitudes de ingreso</h1>
      </div>

      <div className="barra-filtros">
        <select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
          <option value="">Todas</option>
          <option value="NUEVA">Nuevas</option>
          <option value="EN_REVISION">En revisión</option>
          <option value="ACEPTADA">Aceptadas</option>
          <option value="RECHAZADA">Rechazadas</option>
        </select>
      </div>

      {isLoading && <Cargando />}
      {error && <ErrorAviso error={error} />}
      {aceptar.error != null && <ErrorAviso error={aceptar.error} />}
      {rechazar.error != null && <ErrorAviso error={rechazar.error} />}

      {data?.length === 0 && <div className="vacio">No hay solicitudes con ese filtro.</div>}

      <div className="pila">
        {data?.map((s) => (
          <article key={s.id} className="tarjeta">
            <div className="tarjeta-cuerpo">
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0 }}>
                  {s.nombre} {s.apellidoPaterno} {s.apellidoMaterno ?? ''}
                </h3>
                <Insignia valor={s.status} texto={etiqueta(s.status)} />
                <span className="texto-suave" style={{ marginLeft: 'auto', fontSize: '0.85rem' }}>
                  {fmtFechaCorta(s.createdAt)}
                </span>
              </div>

              <div className="texto-suave" style={{ fontSize: '0.9rem', margin: '0.5rem 0' }}>
                {s.email}
                {s.telefono && ` · ${s.telefono}`}
                {s.escuela && ` · ${s.escuela}`}
                {s.boleta && ` · Boleta ${s.boleta}`}
              </div>

              {s.areasInteres.length > 0 && (
                <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', margin: '0.5rem 0' }}>
                  {s.areasInteres.map((a) => (
                    <span key={a} className="insignia">{a.replace(/-/g, ' ')}</span>
                  ))}
                </div>
              )}

              {s.experiencia && (
                <p style={{ fontSize: '0.92rem' }}>
                  <strong>Experiencia:</strong> {s.experiencia}
                </p>
              )}
              {s.mensaje && (
                <p style={{ fontSize: '0.92rem' }}>
                  <strong>Mensaje:</strong> {s.mensaje}
                </p>
              )}

              {(s.status === 'NUEVA' || s.status === 'EN_REVISION') && (
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-verde btn-sm"
                    onClick={() => aceptar.mutate(s.id)}
                    disabled={aceptar.isPending}
                  >
                    Aceptar y crear miembro
                  </button>
                  <button
                    type="button"
                    className="btn btn-borde btn-sm"
                    onClick={() => setRechazando(rechazando === s.id ? null : s.id)}
                  >
                    Rechazar
                  </button>
                </div>
              )}

              {rechazando === s.id && (
                <div style={{ marginTop: '0.75rem' }}>
                  <div className="campo">
                    <label htmlFor={`motivo-${s.id}`}>Motivo del rechazo</label>
                    <input
                      id={`motivo-${s.id}`}
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      placeholder="Queda en el expediente interno."
                    />
                  </div>
                  <button
                    type="button"
                    className="btn btn-peligro btn-sm"
                    disabled={!motivo.trim() || rechazar.isPending}
                    onClick={() => rechazar.mutate(s.id)}
                  >
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
