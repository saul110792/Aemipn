import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { CourseEdition, EnrollmentStatus, Member, Paginated, PaymentStatus } from '../../lib/types';
import { Cargando, ErrorAviso, Insignia } from '../../components/Estado';
import { etiqueta, fmtFechaHora, fmtMoneda, fmtRango, nombreCompleto } from '../../lib/format';
import { useAuth } from '../../lib/auth';

const ESTADOS_INSCRIPCION: EnrollmentStatus[] = [
  'PREINSCRITO', 'INSCRITO', 'ACREDITADO', 'NO_ACREDITADO', 'BAJA',
];
const ESTADOS_PAGO: PaymentStatus[] = ['PENDIENTE', 'PARCIAL', 'PAGADO', 'EXENTO'];

export function EdicionDetalle() {
  const { id } = useParams<{ id: string }>();
  const { esAdmin } = useAuth();
  const qc = useQueryClient();
  const [busqueda, setBusqueda] = useState('');

  const { data: edicion, isLoading, error } = useQuery({
    queryKey: ['edition', id],
    queryFn: () => api.get<CourseEdition>(`/editions/${id}`),
    enabled: Boolean(id),
  });

  // Solo buscamos candidatos cuando ya se escribieron 2+ caracteres.
  const { data: candidatos } = useQuery({
    queryKey: ['members', 'buscar', busqueda],
    queryFn: () => api.get<Paginated<Member>>(`/members?q=${encodeURIComponent(busqueda)}&perPage=8`),
    enabled: esAdmin && busqueda.trim().length >= 2,
  });

  const refrescar = () => qc.invalidateQueries({ queryKey: ['edition', id] });

  const inscribir = useMutation({
    mutationFn: (memberId: string) =>
      api.post('/enrollments', { memberId, editionId: id, status: 'INSCRITO' }),
    onSuccess: () => {
      refrescar();
      setBusqueda('');
    },
  });

  const actualizar = useMutation({
    mutationFn: ({ enrollmentId, campos }: { enrollmentId: string; campos: Record<string, unknown> }) =>
      api.patch(`/enrollments/${enrollmentId}`, campos),
    onSuccess: refrescar,
  });

  const generarSalidas = useMutation({
    mutationFn: () => api.post(`/editions/${id}/activities/generar-cim`),
    onSuccess: refrescar,
  });

  if (isLoading) return <Cargando />;
  if (error) return <ErrorAviso error={error} />;
  if (!edicion) return null;

  const esCim = edicion.course?.kind === 'CIM';
  const inscritos = edicion.inscripciones ?? [];
  const yaInscritos = new Set(inscritos.map((i) => i.member?.id));

  return (
    <>
      <div className="panel-encabezado">
        <div>
          <Link to="/panel/ediciones" className="texto-suave" style={{ fontSize: '0.9rem' }}>
            ← Ediciones
          </Link>
          <h1 style={{ marginTop: '0.4rem' }}>{edicion.clave}</h1>
          <p className="texto-suave" style={{ margin: 0 }}>
            {edicion.course?.nombre} · {fmtRango(edicion.fechaInicio, edicion.fechaFin)}
          </p>
        </div>
        <Insignia valor={edicion.estado} texto={etiqueta(edicion.estado)} />
      </div>

      <div className="rejilla rejilla-4" style={{ marginBottom: '1.5rem' }}>
        <div className="metrica">
          <div className="valor">{inscritos.filter((i) => i.status !== 'BAJA').length}</div>
          <div className="etiqueta">Inscritos{edicion.cupo ? ` de ${edicion.cupo}` : ''}</div>
        </div>
        <div className="metrica">
          <div className="valor">{inscritos.filter((i) => i.paymentStatus === 'PAGADO').length}</div>
          <div className="etiqueta">Pagados</div>
        </div>
        <div className="metrica">
          <div className="valor">{inscritos.filter((i) => i.status === 'ACREDITADO').length}</div>
          <div className="etiqueta">Acreditados</div>
        </div>
        <div className="metrica">
          <div className="valor" style={{ fontSize: '1.4rem' }}>{fmtMoneda(edicion.costo)}</div>
          <div className="etiqueta">Cuota</div>
        </div>
      </div>

      <section className="tarjeta" style={{ marginBottom: '1.5rem' }}>
        <div className="tarjeta-cuerpo">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0 }}>Salidas</h3>
            {esAdmin && esCim && (edicion.actividades?.length ?? 0) === 0 && (
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => generarSalidas.mutate()}
                disabled={generarSalidas.isPending}
              >
                Generar una salida por área
              </button>
            )}
          </div>

          {generarSalidas.error != null && <ErrorAviso error={generarSalidas.error} />}

          {!edicion.actividades?.length ? (
            <div className="vacio">
              Sin salidas programadas.
              {esCim && ' El CIM lleva una por cada área.'}
            </div>
          ) : (
            <div className="tabla-envoltura" style={{ marginTop: '0.75rem' }}>
              <table>
                <thead>
                  <tr>
                    <th>Área</th>
                    <th>Actividad</th>
                    <th>Cuándo</th>
                    <th>Lugar</th>
                    <th>Responsable</th>
                  </tr>
                </thead>
                <tbody>
                  {edicion.actividades.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <span
                          className="insignia"
                          style={a.area?.color ? { background: a.area.color, color: '#fff' } : undefined}
                        >
                          {a.area?.nombre ?? 'General'}
                        </span>
                      </td>
                      <td>{a.titulo}</td>
                      <td className="texto-suave">{fmtFechaHora(a.fechaInicio)}</td>
                      <td className="texto-suave">{a.lugar ?? '—'}</td>
                      <td className="texto-suave">
                        {a.responsable ? `${a.responsable.nombre} ${a.responsable.apellidoPaterno}` : 'Sin asignar'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section className="tarjeta">
        <div className="tarjeta-cuerpo">
          <h3>Roster</h3>

          {esAdmin && (
            <div style={{ marginBottom: '1rem' }}>
              <div className="campo" style={{ maxWidth: '420px', marginBottom: '0.5rem' }}>
                <label htmlFor="buscar-miembro">Inscribir a un miembro</label>
                <input
                  id="buscar-miembro"
                  type="search"
                  placeholder="Escribe al menos 2 letras del nombre o correo…"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </div>

              {inscribir.error != null && <ErrorAviso error={inscribir.error} />}

              {candidatos && candidatos.data.length > 0 && (
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {candidatos.data.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className="btn btn-borde btn-sm"
                      disabled={yaInscritos.has(m.id) || inscribir.isPending}
                      onClick={() => inscribir.mutate(m.id)}
                    >
                      {nombreCompleto(m)}
                      {yaInscritos.has(m.id) && ' (ya inscrito)'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {actualizar.error != null && <ErrorAviso error={actualizar.error} />}

          {inscritos.length === 0 ? (
            <div className="vacio">Nadie inscrito todavía.</div>
          ) : (
            <div className="tabla-envoltura">
              <table>
                <thead>
                  <tr>
                    <th>Participante</th>
                    <th>Contacto</th>
                    <th>Emergencia</th>
                    <th>Estado</th>
                    <th>Pago</th>
                  </tr>
                </thead>
                <tbody>
                  {inscritos.map((i) => (
                    <tr key={i.id}>
                      <td>
                        {i.member && (
                          <Link to={`/panel/miembros/${i.member.id}`}>
                            <strong>{nombreCompleto(i.member)}</strong>
                          </Link>
                        )}
                        {i.member?.tipoSangre && (
                          <div className="texto-suave" style={{ fontSize: '0.8rem' }}>
                            Sangre {i.member.tipoSangre}
                          </div>
                        )}
                      </td>
                      <td className="texto-suave" style={{ fontSize: '0.86rem' }}>
                        {i.member?.email}
                        {i.member?.telefono && <div>{i.member.telefono}</div>}
                      </td>
                      <td className="texto-suave" style={{ fontSize: '0.86rem' }}>
                        {i.member?.contactoEmergencia ?? '—'}
                        {i.member?.telefonoEmergencia && <div>{i.member.telefonoEmergencia}</div>}
                      </td>
                      <td>
                        {esAdmin ? (
                          <select
                            value={i.status}
                            onChange={(e) =>
                              actualizar.mutate({ enrollmentId: i.id, campos: { status: e.target.value } })
                            }
                          >
                            {ESTADOS_INSCRIPCION.map((s) => (
                              <option key={s} value={s}>{etiqueta(s)}</option>
                            ))}
                          </select>
                        ) : (
                          <Insignia valor={i.status} texto={etiqueta(i.status)} />
                        )}
                      </td>
                      <td>
                        {esAdmin ? (
                          <select
                            value={i.paymentStatus}
                            onChange={(e) =>
                              actualizar.mutate({ enrollmentId: i.id, campos: { paymentStatus: e.target.value } })
                            }
                          >
                            {ESTADOS_PAGO.map((s) => (
                              <option key={s} value={s}>{etiqueta(s)}</option>
                            ))}
                          </select>
                        ) : (
                          <Insignia valor={i.paymentStatus} texto={etiqueta(i.paymentStatus)} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
