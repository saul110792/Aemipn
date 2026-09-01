import { Fragment, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { Area, CourseEdition, EnrollmentStatus, Member, Paginated } from '../../lib/types';
import { Cargando, ErrorAviso, Insignia } from '../../components/Estado';
import { PasarLista } from '../../components/PasarLista';
import { etiqueta, fmtFechaHora, fmtRango, nombreCompleto } from '../../lib/format';
import { useAuth } from '../../lib/auth';
import { Icono, hayIcono } from '../../components/Icono';
import { FormularioSesion } from '../../components/FormularioSesion';
import { EditarSesion } from '../../components/EditarSesion';
import { CancelarEdicion } from '../../components/CancelarEdicion';

/** En el orden en que ocurren: se inscribe, cursa y termina de una de tres formas. */
const ESTADOS_INSCRIPCION: EnrollmentStatus[] = [
  'PREINSCRITO',
  'INSCRITO',
  'ACREDITADO',
  'NO_ACREDITADO',
  'DESERTO',
  'BAJA',
];

export function EdicionDetalle() {
  const { id } = useParams<{ id: string }>();
  const { esAdmin } = useAuth();
  const qc = useQueryClient();
  const [busqueda, setBusqueda] = useState('');
  const [agregandoSesion, setAgregandoSesion] = useState(false);
  const [editandoSesion, setEditandoSesion] = useState<string | null>(null);
  const [pasandoLista, setPasandoLista] = useState<string | null>(null);

  const { data: areas } = useQuery({
    queryKey: ['areas'],
    queryFn: () => api.get<Area[]>('/areas'),
    enabled: esAdmin,
  });

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
          <div className="valor">{inscritos.filter((i) => i.status === 'PREINSCRITO').length}</div>
          <div className="etiqueta">Por confirmar</div>
        </div>
        <div className="metrica">
          <div className="valor">{inscritos.filter((i) => i.status === 'ACREDITADO').length}</div>
          <div className="etiqueta">Aprobaron</div>
          <div className="texto-suave" style={{ fontSize: '0.78rem', marginTop: '0.25rem' }}>
            {inscritos.filter((i) => i.status === 'NO_ACREDITADO').length} reprobaron ·{' '}
            {inscritos.filter((i) => i.status === 'DESERTO').length} desertaron
          </div>
        </div>
      </div>

      <section className="tarjeta" style={{ marginBottom: '1.5rem' }}>
        <div className="tarjeta-cuerpo">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0 }}>Programa</h3>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {esAdmin && esCim && (edicion.actividades?.length ?? 0) === 0 && (
                <button
                  type="button"
                  className="btn btn-borde btn-sm"
                  onClick={() => generarSalidas.mutate()}
                  disabled={generarSalidas.isPending}
                >
                  Generar una salida por área
                </button>
              )}
              {esAdmin && (
                <button type="button" className="btn btn-sm" onClick={() => setAgregandoSesion((v) => !v)}>
                  {agregandoSesion ? 'Cerrar' : 'Agregar sesión'}
                </button>
              )}
            </div>
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
                    <th>Tipo</th>
                    <th>Actividad</th>
                    <th>Cuándo</th>
                    <th>Lugar</th>
                    <th>Área</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {edicion.actividades.map((a) => (
                    // La fila y su panel de edición son hermanas, de ahí el fragmento.
                    <Fragment key={a.id}>
                    <tr>
                      <td>
                        <span className="insignia insignia-guinda">{etiqueta(a.kind)}</span>
                      </td>
                      <td>
                        <strong>{a.titulo}</strong>
                        {a.descripcion && (
                          <div className="texto-suave" style={{ fontSize: '0.82rem' }}>{a.descripcion}</div>
                        )}
                      </td>
                      <td className="texto-suave">
                        {fmtFechaHora(a.fechaInicio)}
                        {a.fechaFin && new Date(a.fechaFin).toDateString() !== new Date(a.fechaInicio).toDateString() && (
                          <div>hasta {fmtFechaHora(a.fechaFin)}</div>
                        )}
                      </td>
                      <td className="texto-suave">{a.lugar ?? '—'}</td>
                      <td>
                        {a.area ? (
                          <span
                            className="insignia"
                            style={a.area.color ? { background: a.area.color, color: '#fff' } : undefined}
                          >
                            {hayIcono(a.area.slug) && <Icono nombre={a.area.slug} />}
                            {a.area.nombre}
                          </span>
                        ) : (
                          <span className="texto-suave">—</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '.35rem', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="btn btn-borde btn-sm"
                            onClick={() => {
                              setEditandoSesion(null);
                              setPasandoLista(pasandoLista === a.id ? null : a.id);
                            }}
                          >
                            {pasandoLista === a.id ? 'Cerrar lista' : 'Lista'}
                          </button>
                          {esAdmin && (
                            <button
                              type="button"
                              className="btn btn-borde btn-sm"
                              onClick={() => {
                                setPasandoLista(null);
                                setEditandoSesion(editandoSesion === a.id ? null : a.id);
                              }}
                            >
                              {editandoSesion === a.id ? 'Cerrar' : 'Editar'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {pasandoLista === a.id && (
                      <tr>
                        <td colSpan={6} style={{ background: 'var(--fondo)' }}>
                          <PasarLista actividadId={a.id} />
                        </td>
                      </tr>
                    )}
                    {esAdmin && editandoSesion === a.id && (
                      <tr>
                        <td colSpan={6} style={{ background: 'var(--fondo)' }}>
                          <EditarSesion
                            editionId={edicion.id}
                            actividad={a}
                            areas={areas ?? []}
                            programa={edicion.actividades ?? []}
                            onListo={() => setEditandoSesion(null)}
                            onCancelar={() => setEditandoSesion(null)}
                          />
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {esAdmin && agregandoSesion && (
            <FormularioSesion editionId={edicion.id} />
          )}
        </div>
      </section>

      <section className="tarjeta">
        <div className="tarjeta-cuerpo">
          <h3>Alumnos inscritos</h3>

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
                        {i.member?.alergias && i.member.alergias.length > 0 && (
                          <div style={{ fontSize: '0.78rem', color: 'var(--alerta)', fontWeight: 600 }}>
                            Alergias: {i.member.alergias.join(', ')}
                          </div>
                        )}
                        {i.member?.servicioMedico && (
                          <div className="texto-suave" style={{ fontSize: '0.78rem' }}>
                            {i.member.servicioMedico}
                            {i.member.numeroAfiliacion && ` · ${i.member.numeroAfiliacion}`}
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
                        {(i.member?.contactoEmergencia2 || i.member?.telefonoEmergencia2) && (
                          <div style={{ marginTop: '0.25rem' }}>
                            {i.member?.contactoEmergencia2}
                            {i.member?.telefonoEmergencia2 && ` · ${i.member.telefonoEmergencia2}`}
                          </div>
                        )}
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {esAdmin && (
        <CancelarEdicion edicion={edicion} inscritos={inscritos.length} />
      )}
    </>
  );
}
