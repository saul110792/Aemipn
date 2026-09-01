import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { Area, CargoOMiembro, Member } from '../../lib/types';
import { Cargando, ErrorAviso, Insignia } from '../../components/Estado';
import { etiqueta, fmtFecha, fmtFechaCorta, nombreCompleto } from '../../lib/format';
import { useAuth } from '../../lib/auth';

const CARGOS: CargoOMiembro[] = ['MIEMBRO', 'TESORERO', 'JEFE_DE_AREA', 'JEFE_INTERINO'];

/** Un año a partir de hoy, en el formato que espera un input de fecha. */
function unAnioDesdeHoy() {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

export function MiembroDetalle() {
  const { id } = useParams<{ id: string }>();
  const { esAdmin } = useAuth();
  const qc = useQueryClient();

  const [areaId, setAreaId] = useState('');
  const [role, setRole] = useState<CargoOMiembro>('MIEMBRO');
  const [hasta, setHasta] = useState(unAnioDesdeHoy());
  const [motivo, setMotivo] = useState('');

  // Ser jefe titular exige tener aprobado un curso del área.
  const { data: elegibilidad } = useQuery({
    queryKey: ['elegible', id, areaId],
    queryFn: () =>
      api.get<{ elegible: boolean }>(`/members/${id}/areas/${areaId}/elegible`),
    enabled: Boolean(id && areaId),
  });

  const { data: miembro, isLoading, error } = useQuery({
    queryKey: ['member', id],
    queryFn: () => api.get<Member>(`/members/${id}`),
    enabled: Boolean(id),
  });

  const sigueVigente = (hasta?: string | null) =>
    !hasta || new Date(hasta).getTime() >= Date.now();
  const enFunciones = (miembro?.jefaturas ?? []).filter((j) => sigueVigente(j.hasta));

  const { data: areas } = useQuery({
    queryKey: ['areas'],
    queryFn: () => api.get<Area[]>('/areas'),
    enabled: esAdmin,
  });

  const asignar = useMutation({
    mutationFn: () =>
      api.post(`/members/${id}/areas`, {
        areaId,
        role,
        hasta: role === 'JEFE_INTERINO' ? hasta : null,
        motivo: motivo || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['member', id] });
      setAreaId('');
      setMotivo('');
    },
  });

  const relevar = useMutation({
    mutationFn: (aId: string) => api.post(`/members/${id}/areas/${aId}/relevar`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['member', id] }),
  });

  const quitar = useMutation({
    mutationFn: (aId: string) => api.delete(`/members/${id}/areas/${aId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['member', id] }),
  });

  const cambiarEstado = useMutation({
    mutationFn: (status: string) => api.patch(`/members/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['member', id] }),
  });

  const registrarConsentimiento = useMutation({
    mutationFn: () => api.patch(`/members/${id}`, { consentimiento: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['member', id] }),
  });

  const reenviarCorreo = useMutation({
    mutationFn: () => api.post(`/members/${id}/reenviar-verificacion`),
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

              {esAdmin && miembro.user && (
                <div style={{ marginTop: '1rem', paddingTop: '0.9rem', borderTop: '1px solid var(--borde)' }}>
                  {miembro.user.emailVerificadoEn ? (
                    <span className="texto-suave" style={{ fontSize: '0.85rem' }}>
                      Correo confirmado el {fmtFechaCorta(miembro.user.emailVerificadoEn)}.
                    </span>
                  ) : (
                    <>
                      <span className="texto-suave" style={{ fontSize: '0.85rem' }}>
                        Todavía no confirma su correo — no puede iniciar sesión.
                      </span>
                      <div style={{ marginTop: '0.5rem' }}>
                        <button
                          type="button"
                          className="btn btn-borde btn-sm"
                          disabled={reenviarCorreo.isPending}
                          onClick={() => reenviarCorreo.mutate()}
                        >
                          {reenviarCorreo.isPending ? 'Enviando…' : 'Reenviar correo de confirmación'}
                        </button>
                        {reenviarCorreo.isSuccess && (
                          <span className="texto-suave" style={{ fontSize: '0.82rem', marginLeft: '0.6rem' }}>
                            Enviado. Si no llega, revisa que SMTP_URL esté configurado.
                          </span>
                        )}
                        {reenviarCorreo.error != null && <ErrorAviso error={reenviarCorreo.error} />}
                      </div>
                    </>
                  )}
                </div>
              )}
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
                <Dato titulo="Alergias" valor={miembro.alergias?.length ? miembro.alergias.join(', ') : null} />
                <Dato titulo="Servicio médico" valor={miembro.servicioMedico} />
                <Dato titulo="Número de afiliación" valor={miembro.numeroAfiliacion} />
                <Dato titulo="Contacto de emergencia" valor={miembro.contactoEmergencia} />
                <Dato titulo="Teléfono de emergencia" valor={miembro.telefonoEmergencia} />
                {(miembro.contactoEmergencia2 || miembro.telefonoEmergencia2) && (
                  <>
                    <Dato titulo="Segundo contacto" valor={miembro.contactoEmergencia2} />
                    <Dato titulo="Teléfono del segundo contacto" valor={miembro.telefonoEmergencia2} />
                  </>
                )}
              </dl>

              <div style={{ marginTop: '1rem', paddingTop: '0.9rem', borderTop: '1px solid var(--borde)' }}>
                {miembro.consentimientoDatosSensiblesEn ? (
                  <span className="texto-suave" style={{ fontSize: '0.85rem' }}>
                    Consintió el tratamiento de sus datos sensibles el{' '}
                    {fmtFechaCorta(miembro.consentimientoDatosSensiblesEn)}.
                  </span>
                ) : (
                  <>
                    <span className="texto-suave" style={{ fontSize: '0.85rem' }}>
                      Sin consentimiento registrado para el tratamiento de sus datos sensibles.
                    </span>
                    {esAdmin && (
                      <div style={{ marginTop: '0.4rem' }}>
                        <button
                          type="button"
                          className="btn btn-borde btn-sm"
                          disabled={registrarConsentimiento.isPending}
                          onClick={() => {
                            if (
                              confirm(
                                '¿Confirmas que esta persona ya dio su consentimiento (por ejemplo, firmó un formato en papel)?',
                              )
                            ) {
                              registrarConsentimiento.mutate();
                            }
                          }}
                        >
                          Registrar consentimiento
                        </button>
                        {registrarConsentimiento.error != null && (
                          <ErrorAviso error={registrarConsentimiento.error} />
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
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
                {miembro.areas?.map((am) => {
                  // Pertenecer y encabezar son cosas distintas: lo primero es
                  // estable, lo segundo es un periodo que empieza y termina.
                  const cargo = enFunciones.find((j) => j.areaId === am.area.id);
                  return (
                    <div
                      key={am.id}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--borde)' }}
                    >
                      <span style={{ width: 4, height: 28, background: am.area.color ?? 'var(--roca)', borderRadius: 2 }} />
                      <div style={{ flex: 1 }}>
                        <strong style={{ fontSize: '0.93rem' }}>{am.area.nombre}</strong>
                        <div className="texto-suave" style={{ fontSize: '0.82rem' }}>
                          {cargo ? (
                            <>
                              <strong style={{ color: 'var(--guinda-600)' }}>{etiqueta(cargo.cargo)}</strong>
                              {' desde '}{fmtFechaCorta(cargo.desde)}
                              {cargo.hasta && (
                                <>{' · hasta '}{fmtFechaCorta(cargo.hasta)}</>
                              )}
                            </>
                          ) : (
                            'Miembro del área'
                          )}
                        </div>
                        {cargo?.asignadoPor && (
                          <div className="texto-suave" style={{ fontSize: '0.76rem' }}>
                            {'Nombrado por '}{cargo.asignadoPor}
                            {cargo.motivo ? ' — ' + cargo.motivo : ''}
                          </div>
                        )}
                      </div>
                      {esAdmin && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          {cargo && (
                            <button
                              type="button"
                              className="btn btn-borde btn-sm"
                              onClick={() => relevar.mutate(am.area.id)}
                              disabled={relevar.isPending}
                              title="Cerrar el cargo; sigue como miembro del área"
                            >
                              Relevar
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn btn-borde btn-sm"
                            onClick={() => quitar.mutate(am.area.id)}
                            disabled={quitar.isPending}
                            title="Dar de baja del área"
                          >
                            Quitar
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <HistorialDeCargos miembro={miembro} />

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
                    <label htmlFor="asignar-rol">Cargo</label>
                    <select id="asignar-rol" value={role} onChange={(e) => setRole(e.target.value as CargoOMiembro)}>
                      {CARGOS.map((r) => (
                        <option
                          key={r}
                          value={r}
                          disabled={r === 'JEFE_DE_AREA' && elegibilidad?.elegible === false}
                        >
                          {etiqueta(r)}
                          {r === 'JEFE_DE_AREA' && elegibilidad?.elegible === false
                            ? ' — sin curso del área'
                            : ''}
                        </option>
                      ))}
                    </select>
                    {role === 'JEFE_DE_AREA' && elegibilidad && (
                      <span className="texto-suave" style={{ fontSize: '0.8rem' }}>
                        {elegibilidad.elegible
                          ? 'Tiene un curso del área aprobado.'
                          : 'No tiene ningún curso de esta área aprobado; nombra a un interino.'}
                      </span>
                    )}
                  </div>

                  {role === 'JEFE_INTERINO' && (
                    <>
                      <div className="campo">
                        <label htmlFor="asignar-hasta">Hasta *</label>
                        <input
                          id="asignar-hasta"
                          type="date"
                          value={hasta}
                          max={unAnioDesdeHoy()}
                          onChange={(e) => setHasta(e.target.value)}
                        />
                        <span className="texto-suave" style={{ fontSize: '0.8rem' }}>
                          Un interino no puede pasar de doce meses; al vencer deja de mandar solo.
                        </span>
                      </div>
                      <div className="campo">
                        <label htmlFor="asignar-motivo">Motivo</label>
                        <input
                          id="asignar-motivo"
                          value={motivo}
                          placeholder="Nadie acreditado en el área todavía"
                          onChange={(e) => setMotivo(e.target.value)}
                        />
                      </div>
                    </>
                  )}
                  <button
                    type="button"
                    className="btn btn-verde btn-sm"
                    disabled={!areaId || asignar.isPending}
                    onClick={() => asignar.mutate()}
                  >
                    Asignar
                  </button>
                  {asignar.error != null && <ErrorAviso error={asignar.error} />}
                  {relevar.error != null && <ErrorAviso error={relevar.error} />}
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

/**
 * Por dónde ha pasado esta persona, y qué impartió mientras tanto.
 *
 * Los cargos cerrados son la parte que antes no existía: al relevar se pisaba
 * el registro y la asociación se quedaba sin memoria de quién dirigió qué.
 */
function HistorialDeCargos({ miembro }: { miembro: Member }) {
  const ahora = Date.now();
  const cerradas = (miembro.jefaturas ?? []).filter(
    (j) => Boolean(j.hasta) && new Date(j.hasta!).getTime() < ahora,
  );
  const impartidas = miembro.edicionesImpartidas ?? [];

  if (cerradas.length === 0 && impartidas.length === 0) return null;

  return (
    <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--borde)' }}>
      {cerradas.length > 0 && (
        <>
          <h4 style={{ fontSize: '0.9rem', margin: '0 0 .5rem' }}>Cargos anteriores</h4>
          <div className="pila">
            {cerradas.map((j) => (
              <div key={j.id} style={{ fontSize: '0.84rem', marginBottom: '.5rem' }}>
                <strong>{etiqueta(j.cargo)}</strong>
                {' de '}{j.area?.nombre ?? 'su área'}
                <div className="texto-suave" style={{ fontSize: '0.8rem' }}>
                  {fmtFechaCorta(j.desde)} — {fmtFechaCorta(j.hasta!)}
                  {j.motivoRelevo ? ' · ' + j.motivoRelevo : ''}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {impartidas.length > 0 && (
        <>
          <h4 style={{ fontSize: '0.9rem', margin: '1rem 0 .5rem' }}>Cursos que ha impartido</h4>
          <div className="pila">
            {impartidas.map((e) => (
              <div key={e.id} style={{ fontSize: '0.84rem', marginBottom: '.4rem' }}>
                <code style={{ fontWeight: 700, color: 'var(--guinda)' }}>{e.clave}</code>
                {' '}{e.course.nombre}
                <div className="texto-suave" style={{ fontSize: '0.8rem' }}>
                  {fmtFechaCorta(e.fechaInicio)} — {fmtFechaCorta(e.fechaFin)}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
