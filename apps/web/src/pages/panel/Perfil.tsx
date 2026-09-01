import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { Area, Course } from '../../lib/types';
import { Cargando, ErrorAviso, Insignia } from '../../components/Estado';
import { Icono, hayIcono } from '../../components/Icono';
import { etiqueta, fmtFecha } from '../../lib/format';
import { CampoEtiquetas } from '../../components/CampoEtiquetas';
import {
  ALERGIAS_SUGERIDAS,
  LARGO_MAXIMO_ALERGIA,
  MAXIMO_ALERGIAS,
  SERVICIOS_MEDICOS_SUGERIDOS,
  TIPOS_DE_SANGRE,
} from '../../lib/catalogos';

/** Valor del <select> cuando la institución no está en la lista sugerida. */
const OTRO_SERVICIO = '__otro__';

const ANIO_MINIMO = 1980;
const LETRAS = ['A', 'B', 'C', 'D', 'E'] as const;

/** El desplegable separa las tres cosas: no son equivalentes. */
const GRUPOS = [
  { kind: 'CIM', titulo: 'Curso introductorio' },
  { kind: 'AREA', titulo: 'Cursos de área — el curso base integra al área' },
  { kind: 'TALLER', titulo: 'Talleres' },
  { kind: 'CERTIFICACION', titulo: 'Certificaciones' },
] as const;

interface Declaracion {
  id: string;
  anio: number;
  letra: string;
  status: 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';
  motivoRechazo: string | null;
  editadaPor: string | null;
  notas?: string | null;
  courseId?: string;
  revisadaPor: string | null;
  course: Course & { area: Pick<Area, 'id' | 'nombre' | 'slug' | 'color'> | null };
}

interface PerfilPropio {
  id: string;
  nombre: string;
  apellidoPaterno: string;
  servicioMedico: string | null;
  numeroAfiliacion: string | null;
  contactoEmergencia: string | null;
  telefonoEmergencia: string | null;
  contactoEmergencia2: string | null;
  telefonoEmergencia2: string | null;
  consentimientoDatosSensiblesEn: string | null;
  direccion: string | null;
  lesiones: string | null;
  tipoSangre: string | null;
  alergias: string[];
  telefono: string | null;
  boleta: string | null;
  escuela: string | null;
  perfilCompleto: boolean;
  faltantes: string[];
  areas: { id: string; role: string; area: Area }[];
  cursosDeclarados: Declaracion[];
}

export function Perfil() {
  const qc = useQueryClient();
  const [guardado, setGuardado] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['perfil'],
    queryFn: () => api.get<PerfilPropio>('/perfil'),
  });

  const [f, setF] = useState({
    telefono: '', numeroAfiliacion: '', contactoEmergencia: '', telefonoEmergencia: '',
    contactoEmergencia2: '', telefonoEmergencia2: '', direccion: '', lesiones: '', tipoSangre: '',
  });
  const [alergias, setAlergias] = useState<string[]>([]);
  const [servicioSelect, setServicioSelect] = useState('');
  const [servicioTexto, setServicioTexto] = useState('');
  const [aceptoAviso, setAceptoAviso] = useState(false);

  useEffect(() => {
    if (!data) return;
    setF({
      telefono: data.telefono ?? '',
      numeroAfiliacion: data.numeroAfiliacion ?? '',
      contactoEmergencia: data.contactoEmergencia ?? '',
      telefonoEmergencia: data.telefonoEmergencia ?? '',
      contactoEmergencia2: data.contactoEmergencia2 ?? '',
      telefonoEmergencia2: data.telefonoEmergencia2 ?? '',
      direccion: data.direccion ?? '',
      lesiones: data.lesiones ?? '',
      tipoSangre: data.tipoSangre ?? '',
    });
    setAlergias(data.alergias ?? []);

    const guardado = data.servicioMedico ?? '';
    if (guardado && (SERVICIOS_MEDICOS_SUGERIDOS as readonly string[]).includes(guardado)) {
      setServicioSelect(guardado);
      setServicioTexto('');
    } else if (guardado) {
      setServicioSelect(OTRO_SERVICIO);
      setServicioTexto(guardado);
    } else {
      setServicioSelect('');
      setServicioTexto('');
    }
  }, [data?.id]);

  const yaConsintio = Boolean(data?.consentimientoDatosSensiblesEn);
  const servicioMedico = servicioSelect === OTRO_SERVICIO ? servicioTexto.trim() : servicioSelect;

  const guardar = useMutation({
    mutationFn: () =>
      api.patch('/perfil', {
        telefono: f.telefono || null,
        servicioMedico,
        numeroAfiliacion: f.numeroAfiliacion,
        contactoEmergencia: f.contactoEmergencia,
        telefonoEmergencia: f.telefonoEmergencia,
        contactoEmergencia2: f.contactoEmergencia2 || null,
        telefonoEmergencia2: f.telefonoEmergencia2 || null,
        direccion: f.direccion || null,
        lesiones: f.lesiones || null,
        tipoSangre: f.tipoSangre || null,
        alergias,
        ...(aceptoAviso ? { consentimiento: true } : {}),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['perfil'] });
      setGuardado(true);
    },
  });

  if (isLoading) return <Cargando />;
  if (error) return <ErrorAviso error={error} />;
  if (!data) return null;

  const obligatoriosListos = Boolean(
    servicioMedico &&
      f.numeroAfiliacion.trim() &&
      f.contactoEmergencia.trim() &&
      f.telefonoEmergencia.trim() &&
      (yaConsintio || aceptoAviso),
  );

  return (
    <>
      <div className="panel-encabezado">
        <div>
          <h1>Mi expediente</h1>
          <p className="texto-suave" style={{ margin: 0 }}>
            Lo que la logística de una salida necesita saber de ti, y los cursos que has tomado.
          </p>
        </div>
      </div>

      {!data.perfilCompleto && (
        <div className="aviso aviso-ambar" style={{ background: 'var(--alerta-fondo)', borderColor: '#f0d9a8', color: '#7c4a04' }}>
          Falta tu <strong>servicio médico</strong> y tu <strong>contacto de emergencia</strong>.
          Sin eso no puedes inscribirte a una salida: son los datos que se llevan a campo.
        </div>
      )}
      {guardar.error != null && <ErrorAviso error={guardar.error} />}
      {guardado && <div className="aviso aviso-ok">Expediente actualizado.</div>}

      <section className="tarjeta" style={{ marginBottom: '1.5rem' }}>
        <div className="tarjeta-cuerpo">
          <h3>Datos para salidas</h3>

          <div className="campos-2">
            <div className="campo">
              <label htmlFor="p-servicio">Servicio médico *</label>
              <select id="p-servicio" value={servicioSelect}
                onChange={(e) => setServicioSelect(e.target.value)}>
                <option value="">Elige uno…</option>
                {SERVICIOS_MEDICOS_SUGERIDOS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
                <option value={OTRO_SERVICIO}>Otro, especificar…</option>
              </select>
            </div>
            {servicioSelect === OTRO_SERVICIO && (
              <div className="campo">
                <label htmlFor="p-servicio-otro">¿Cuál?</label>
                <input id="p-servicio-otro" value={servicioTexto} placeholder="GNP, AXA, Seguros Monterrey…"
                  onChange={(e) => setServicioTexto(e.target.value)} />
              </div>
            )}
            <div className="campo">
              <label htmlFor="p-afiliacion">Número de afiliación *</label>
              <input id="p-afiliacion" value={f.numeroAfiliacion} inputMode="numeric"
                onChange={(e) => setF({ ...f, numeroAfiliacion: e.target.value })} />
            </div>
            <div className="campo">
              <label htmlFor="p-tel">Tu teléfono</label>
              <input id="p-tel" type="tel" value={f.telefono}
                onChange={(e) => setF({ ...f, telefono: e.target.value })} />
            </div>
            <div className="campo">
              <label htmlFor="p-sangre">Tipo de sangre</label>
              <select id="p-sangre" value={f.tipoSangre}
                onChange={(e) => setF({ ...f, tipoSangre: e.target.value })}>
                <option value="">No lo sé</option>
                {TIPOS_DE_SANGRE.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="campos-2" style={{ marginTop: '0.5rem' }}>
            <div className="campo">
              <label htmlFor="p-ce">Contacto de emergencia · nombre *</label>
              <input id="p-ce" value={f.contactoEmergencia}
                onChange={(e) => setF({ ...f, contactoEmergencia: e.target.value })} />
            </div>
            <div className="campo">
              <label htmlFor="p-te">Contacto de emergencia · teléfono *</label>
              <input id="p-te" type="tel" value={f.telefonoEmergencia}
                onChange={(e) => setF({ ...f, telefonoEmergencia: e.target.value })} />
            </div>
            <div className="campo">
              <label htmlFor="p-ce2">
                Segundo contacto · nombre
                <span className="texto-suave" style={{ fontWeight: 400 }}> — opcional</span>
              </label>
              <input id="p-ce2" value={f.contactoEmergencia2}
                onChange={(e) => setF({ ...f, contactoEmergencia2: e.target.value })} />
            </div>
            <div className="campo">
              <label htmlFor="p-te2">
                Segundo contacto · teléfono
                <span className="texto-suave" style={{ fontWeight: 400 }}> — opcional</span>
              </label>
              <input id="p-te2" type="tel" value={f.telefonoEmergencia2}
                onChange={(e) => setF({ ...f, telefonoEmergencia2: e.target.value })} />
            </div>
          </div>

          <div className="campo">
            <label htmlFor="p-alergias">
              Alergias
              <span className="texto-suave" style={{ fontWeight: 400 }}>
                {' '}— elige de la lista o escribe la tuya
              </span>
            </label>
            <CampoEtiquetas
              id="p-alergias"
              valores={alergias}
              sugerencias={ALERGIAS_SUGERIDAS}
              onCambio={setAlergias}
              maximo={MAXIMO_ALERGIAS}
              largoMaximo={LARGO_MAXIMO_ALERGIA}
              placeholder="Penicilina, mariscos…"
            />
          </div>

          <div className="campo">
            <label htmlFor="p-dir">
              Dirección <span className="texto-suave" style={{ fontWeight: 400 }}>— opcional</span>
            </label>
            <input id="p-dir" value={f.direccion}
              onChange={(e) => setF({ ...f, direccion: e.target.value })} />
          </div>

          <div className="campo">
            <label htmlFor="p-lesiones">
              Lesiones u operaciones
              <span className="texto-suave" style={{ fontWeight: 400 }}>
                {' '}— cualquier cosa que pueda influir en la montaña
              </span>
            </label>
            <textarea
              id="p-lesiones"
              style={{ minHeight: 90 }}
              placeholder="Fractura de tobillo en 2021, ya consolidada. Cirugía de menisco izquierdo."
              value={f.lesiones}
              onChange={(e) => setF({ ...f, lesiones: e.target.value })}
            />
            <span className="texto-suave" style={{ fontSize: '0.83rem' }}>
              Lo ve la mesa directiva y el responsable de tu salida. Sirve para cuidarte, no para excluirte.
            </span>
          </div>

          {yaConsintio ? (
            <p className="texto-suave" style={{ fontSize: '0.85rem' }}>
              Aceptaste el <Link to="/aviso-de-privacidad">aviso de privacidad</Link> el{' '}
              {fmtFecha(data.consentimientoDatosSensiblesEn!)}.
            </p>
          ) : (
            <label className="casilla" style={{ alignItems: 'flex-start', marginBottom: '1rem' }}>
              <input type="checkbox" checked={aceptoAviso}
                onChange={(e) => setAceptoAviso(e.target.checked)} />
              <span>
                Tipo de sangre, alergias, padecimientos y servicio médico son datos personales{' '}
                <strong>sensibles</strong>. He leído el{' '}
                <Link to="/aviso-de-privacidad" target="_blank">aviso de privacidad</Link> y
                autorizo su tratamiento para fines de seguridad en las actividades de la
                asociación.
              </span>
            </label>
          )}

          <button type="button" className="btn btn-verde"
            disabled={!obligatoriosListos || guardar.isPending}
            onClick={() => { setGuardado(false); guardar.mutate(); }}>
            {guardar.isPending ? 'Guardando…' : 'Guardar expediente'}
          </button>
        </div>
      </section>

      {data.areas.length > 0 && (
        <section className="tarjeta" style={{ marginBottom: '1.5rem' }}>
          <div className="tarjeta-cuerpo">
            <h3>Tus áreas</h3>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {data.areas.map((a) => (
                <span key={a.id} className="insignia" style={{ background: `${a.area.color}1f`, color: a.area.color ?? undefined }}>
                  {hayIcono(a.area.slug) && <Icono nombre={a.area.slug} />}
                  {a.area.nombre} · {etiqueta(a.role)}
                </span>
              ))}
            </div>
            <p className="texto-suave" style={{ fontSize: '0.87rem', marginTop: '0.75rem', marginBottom: 0 }}>
              Perteneces a un área cuando el jefe aprueba un curso que declaraste de ella.
            </p>
          </div>
        </section>
      )}

      <CursosDeclarados declaraciones={data.cursosDeclarados} />
    </>
  );
}

function CursosDeclarados({ declaraciones }: { declaraciones: Declaracion[] }) {
  const qc = useQueryClient();
  const anioActual = new Date().getFullYear();
  const [f, setF] = useState({ courseId: '', anio: String(anioActual), letra: 'A' });
  // Declaración que se está corrigiendo, con su año y letra en edición.
  const [editando, setEditando] = useState<{ id: string; anio: string; letra: string } | null>(null);

  const { data: cursos } = useQuery({
    queryKey: ['courses'],
    queryFn: () => api.get<Course[]>('/courses'),
  });

  const refrescar = () => {
    qc.invalidateQueries({ queryKey: ['perfil'] });
    qc.invalidateQueries({ queryKey: ['notificaciones'] });
  };

  const declarar = useMutation({
    mutationFn: () =>
      api.post('/perfil/cursos', {
        courseId: f.courseId,
        anio: Number(f.anio),
        letra: f.letra,
      }),
    onSuccess: () => {
      refrescar();
      setF({ ...f, courseId: '' });
    },
  });

  const retirar = useMutation({
    mutationFn: (id: string) => api.delete(`/perfil/cursos/${id}`),
    onSuccess: refrescar,
  });

  const corregir = useMutation({
    mutationFn: () =>
      api.patch(`/perfil/cursos/${editando!.id}`, {
        anio: Number(editando!.anio),
        letra: editando!.letra,
      }),
    onSuccess: () => {
      refrescar();
      setEditando(null);
    },
  });

  const anios = Array.from({ length: anioActual - ANIO_MINIMO + 1 }, (_, i) => anioActual - i);
  const curso = cursos?.find((c) => c.id === f.courseId);
  const vistaPrevia = curso?.codigo ? `${curso.codigo}_${f.anio}${f.letra}` : null;

  return (
    <section className="tarjeta">
      <div className="tarjeta-cuerpo">
        <h3>Cursos y talleres que he tomado</h3>
        <p className="texto-suave" style={{ fontSize: '0.9rem' }}>
          Declara cada uno con su generación; el jefe del área lo revisa. Aprobar el
          <strong> curso base</strong> de un área es lo que te integra a ella. Los talleres quedan
          en tu historial, pero no abren el área por sí solos.
        </p>

        {declaraciones.length === 0 ? (
          <div className="vacio">Todavía no has declarado ningún curso.</div>
        ) : (
          <div className="tabla-envoltura" style={{ marginBottom: '1.25rem' }}>
            <table>
              <thead>
                <tr>
                  <th>Generación</th>
                  <th>Curso</th>
                  <th>Área</th>
                  <th>Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {declaraciones.map((d) => (
                  <tr key={d.id}>
                    <td>
                      {editando?.id === d.id ? (
                        <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                          <select
                            value={editando.anio}
                            aria-label="Año"
                            onChange={(e) => setEditando({ ...editando, anio: e.target.value })}
                            style={{ padding: '0.25rem' }}
                          >
                            {anios.map((a) => (
                              <option key={a} value={a}>{a}</option>
                            ))}
                          </select>
                          <select
                            value={editando.letra}
                            aria-label="Generación"
                            onChange={(e) => setEditando({ ...editando, letra: e.target.value })}
                            style={{ padding: '0.25rem' }}
                          >
                            {LETRAS.map((l) => (
                              <option key={l} value={l}>{l}</option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <code style={{ fontWeight: 700, color: 'var(--guinda)' }}>
                          {d.course.codigo ?? '—'}_{d.anio}{d.letra}
                        </code>
                      )}
                    </td>
                    <td>
                      {d.course.nombre}
                      {d.course.kind === 'AREA' && (
                        <div className="texto-suave" style={{ fontSize: '0.78rem' }}>
                          Curso base · da acceso al área
                        </div>
                      )}
                    </td>
                    <td>
                      {d.course.area ? (
                        <span className="insignia" style={{ background: `${d.course.area.color}1f`, color: d.course.area.color ?? undefined }}>
                          {hayIcono(d.course.area.slug) && <Icono nombre={d.course.area.slug} />}
                          {d.course.area.nombre}
                        </span>
                      ) : (
                        <span className="texto-suave">Transversal</span>
                      )}
                    </td>
                    <td>
                      <Insignia valor={d.status} texto={etiqueta(d.status)} />
                      {d.motivoRechazo && (
                        <div className="texto-suave" style={{ fontSize: '0.8rem' }}>{d.motivoRechazo}</div>
                      )}
                      {d.editadaPor && (
                        <div className="texto-suave" style={{ fontSize: '0.76rem' }}>
                          {'Corregida por '}{d.editadaPor}
                        </div>
                      )}
                    </td>
                    <td>
                      {d.status === 'PENDIENTE' && (
                        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                          {editando?.id === d.id ? (
                            <>
                              <button type="button" className="btn btn-verde btn-sm"
                                onClick={() => corregir.mutate()} disabled={corregir.isPending}>
                                Guardar
                              </button>
                              <button type="button" className="btn btn-borde btn-sm"
                                onClick={() => setEditando(null)}>
                                Cancelar
                              </button>
                            </>
                          ) : (
                            <>
                              <button type="button" className="btn btn-borde btn-sm"
                                onClick={() =>
                                  setEditando({ id: d.id, anio: String(d.anio), letra: d.letra })
                                }>
                                Corregir
                              </button>
                              <button type="button" className="btn btn-borde btn-sm"
                                onClick={() => retirar.mutate(d.id)} disabled={retirar.isPending}>
                                Retirar
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {declarar.error != null && <ErrorAviso error={declarar.error} />}
        {corregir.error != null && <ErrorAviso error={corregir.error} />}
        {retirar.error != null && <ErrorAviso error={retirar.error} />}

        <div style={{ borderTop: '1px solid var(--borde)', paddingTop: '1rem' }}>
          <h4 style={{ marginTop: 0 }}>Declarar un curso</h4>

          <div className="campos-2">
            <div className="campo">
              <label htmlFor="d-curso">Curso *</label>
              <select id="d-curso" value={f.courseId} onChange={(e) => setF({ ...f, courseId: e.target.value })}>
                <option value="">Elige un curso o taller…</option>
                {GRUPOS.map(({ kind, titulo }) => {
                  const delGrupo = (cursos ?? []).filter((c) => c.kind === kind);
                  if (delGrupo.length === 0) return null;
                  return (
                    <optgroup key={kind} label={titulo}>
                      {delGrupo.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.codigo ? `${c.codigo} · ` : ''}{c.nombre}
                          {c.area ? ` — ${c.area.nombre}` : ''}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
            </div>

            <div className="campo">
              <label htmlFor="d-anio">Año *</label>
              <select id="d-anio" value={f.anio} onChange={(e) => setF({ ...f, anio: e.target.value })}>
                {anios.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

            <div className="campo">
              <label>Generación *</label>
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                {LETRAS.map((l) => (
                  <button
                    key={l}
                    type="button"
                    className={f.letra === l ? 'btn btn-sm' : 'btn btn-borde btn-sm'}
                    style={{ minWidth: 44 }}
                    onClick={() => setF({ ...f, letra: l })}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {vistaPrevia && (
            <p className="texto-suave" style={{ fontSize: '0.88rem' }}>
              Vas a declarar <code style={{ fontWeight: 700, color: 'var(--guinda)' }}>{vistaPrevia}</code>
            </p>
          )}

          <button type="button" className="btn btn-verde"
            disabled={!f.courseId || declarar.isPending}
            onClick={() => declarar.mutate()}>
            {declarar.isPending ? 'Enviando…' : 'Enviar a validación'}
          </button>
        </div>
      </div>
    </section>
  );
}
