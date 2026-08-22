import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { Area, AreaRole, Member } from '../../lib/types';
import { Cargando, ErrorAviso, Insignia } from '../../components/Estado';
import { etiqueta, fmtFecha, fmtFechaCorta, nombreCompleto } from '../../lib/format';
import { useAuth } from '../../lib/auth';

const ROLES: AreaRole[] = ['MIEMBRO', 'JEFE_DE_AREA', 'TESORERO'];

export function MiembroDetalle() {
  const { id } = useParams<{ id: string }>();
  const { esAdmin } = useAuth();
  const qc = useQueryClient();

  const [areaId, setAreaId] = useState('');
  const [role, setRole] = useState<AreaRole>('MIEMBRO');

  const { data: miembro, isLoading, error } = useQuery({
    queryKey: ['member', id],
    queryFn: () => api.get<Member>(`/members/${id}`),
    enabled: Boolean(id),
  });

  const { data: areas } = useQuery({
    queryKey: ['areas'],
    queryFn: () => api.get<Area[]>('/areas'),
    enabled: esAdmin,
  });

  const asignar = useMutation({
    mutationFn: () => api.post(`/members/${id}/areas`, { areaId, role }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['member', id] });
      setAreaId('');
    },
  });

  const quitar = useMutation({
    mutationFn: (aId: string) => api.delete(`/members/${id}/areas/${aId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['member', id] }),
  });

  const cambiarEstado = useMutation({
    mutationFn: (status: string) => api.patch(`/members/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['member', id] }),
  });

  if (isLoading) return <Cargando />;
  if (error) return <ErrorAviso error={error} />;
  if (!miembro) return null;

  // Solo ofrecemos las areas donde aun no esta.
  const disponibles = areas?.filter((a) => !miembro.areas?.some((am) => am.area.id === a.id)) ?? [];

  return (
    <>
      <div className="panel-encabezado">
        <div>
          <Link to="/panel/miembros" className="texto-suave" style={{ fontSize: '0.9rem' }}>
            ← Miembros
          </Link>
          <h1 style={{ marginTop: '0.4rem' }}>{nombreCompleto(miembro)}</h1>
        </div>
        {esAdmin && (
          <select
            value={miembro.status}
            onChange={(e) => cambiarEstado.mutate(e.target.value)}
            disabled={cambiarEstado.isPending}
          >
            {['ASPIRANTE', 'ACTIVO', 'INACTIVO', 'BAJA'].map((s) => (
              <option key={s} value={s}>{etiqueta(s)}</option>
            ))}
          </select>
        )}
      </div>

      {cambiarEstado.error != null && <ErrorAviso error={cambiarEstado.error} />}

      <div className="rejilla" style={{ gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)' }}>
        <div className="pila">
          <section className="tarjeta">
            <div className="tarjeta-cuerpo">
              <h3>Datos generales</h3>
              <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '0.9rem', margin: 0 }}>
                <Dato titulo="Correo" valor={miembro.email} />
                <Dato titulo="Teléfono" valor={miembro.telefono} />
                <Dato titulo="Boleta" valor={miembro.boleta} />
                <Dato titulo="Escuela" valor={miembro.escuela} />
                <Dato titulo="Ingreso" valor={fmtFecha(miembro.fechaIngreso)} />
                <Dato titulo="Estado" valor={etiqueta(miembro.status)} />
              </dl>
            </div>
          </section>

          <section className="tarjeta">
            <div className="tarjeta-cuerpo">
              <h3>Datos para salidas</h3>
              <p className="texto-suave" style={{ fontSize: '0.87rem' }}>
                Lo que el responsable de una salida necesita a la mano en campo.
              </p>
              <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '0.9rem', margin: 0 }}>
                <Dato titulo="Tipo de sangre" valor={miembro.tipoSangre} />
                <Dato titulo="Contacto de emergencia" valor={miembro.contactoEmergencia} />
                <Dato titulo="Teléfono de emergencia" valor={miembro.telefonoEmergencia} />
              </dl>
            </div>
          </section>

          <section className="tarjeta">
            <div className="tarjeta-cuerpo">
              <h3>Historial de cursos</h3>
              {!miembro.enrollments?.length ? (
                <div className="vacio">Aún no está inscrito en ningún curso.</div>
              ) : (
                <div className="tabla-envoltura">
                  <table>
                    <thead>
                      <tr>
                        <th>Curso</th>
                        <th>Edición</th>
                        <th>Inscripción</th>
                        <th>Estado</th>
                        <th>Pago</th>
                      </tr>
                    </thead>
                    <tbody>
                      {miembro.enrollments.map((e) => (
                        <tr key={e.id}>
                          <td>{e.edition?.course?.nombre ?? '—'}</td>
                          <td>
                            {e.edition && (
                              <Link to={`/panel/ediciones/${e.edition.id}`}>{e.edition.clave}</Link>
                            )}
                          </td>
                          <td className="texto-suave">{fmtFechaCorta(e.fechaInscripcion)}</td>
                          <td><Insignia valor={e.status} texto={etiqueta(e.status)} /></td>
                          <td><Insignia valor={e.paymentStatus} texto={etiqueta(e.paymentStatus)} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </div>

        <aside>
          <section className="tarjeta">
            <div className="tarjeta-cuerpo">
              <h3>Áreas</h3>

              {!miembro.areas?.length && <p className="texto-suave">Sin área asignada.</p>}

              <div className="pila">
                {miembro.areas?.map((am) => (
                  <div
                    key={am.id}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--borde)' }}
                  >
                    <span style={{ width: 4, height: 28, background: am.area.color ?? 'var(--roca)', borderRadius: 2 }} />
                    <div style={{ flex: 1 }}>
                      <strong style={{ fontSize: '0.93rem' }}>{am.area.nombre}</strong>
                      <div className="texto-suave" style={{ fontSize: '0.82rem' }}>{etiqueta(am.role)}</div>
                    </div>
                    {esAdmin && (
                      <button
                        type="button"
                        className="btn btn-borde btn-sm"
                        onClick={() => quitar.mutate(am.area.id)}
                        disabled={quitar.isPending}
                        title="Dar de baja del área"
                      >
                        Quitar
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {esAdmin && disponibles.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                  <div className="campo">
                    <label htmlFor="asignar-area">Asignar a un área</label>
                    <select id="asignar-area" value={areaId} onChange={(e) => setAreaId(e.target.value)}>
                      <option value="">Elige un área…</option>
                      {disponibles.map((a) => (
                        <option key={a.id} value={a.id}>{a.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div className="campo">
                    <label htmlFor="asignar-rol">Rol</label>
                    <select id="asignar-rol" value={role} onChange={(e) => setRole(e.target.value as AreaRole)}>
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{etiqueta(r)}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    className="btn btn-verde btn-sm"
                    disabled={!areaId || asignar.isPending}
                    onClick={() => asignar.mutate()}
                  >
                    Asignar
                  </button>
                  {asignar.error != null && <ErrorAviso error={asignar.error} />}
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}

const Dato = ({ titulo, valor }: { titulo: string; valor: string | null | undefined }) => (
  <div>
    <dt className="texto-suave" style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
      {titulo}
    </dt>
    <dd style={{ margin: 0, fontWeight: 600 }}>{valor || '—'}</dd>
  </div>
);
