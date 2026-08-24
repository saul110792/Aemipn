import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { Area, Course } from '../../lib/types';
import { Cargando, ErrorAviso, Insignia } from '../../components/Estado';
import { Icono, hayIcono } from '../../components/Icono';
import { etiqueta } from '../../lib/format';

const ANIO_MINIMO = 1980;
const LETRAS = ['A', 'B', 'C', 'D', 'E'] as const;

interface Declaracion {
  id: string;
  anio: number;
  letra: string;
  status: 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';
  motivoRechazo: string | null;
  revisadaPor: string | null;
  course: Course & { area: Pick<Area, 'id' | 'nombre' | 'slug' | 'color'> | null };
}

interface PerfilPropio {
  id: string;
  nombre: string;
  apellidoPaterno: string;
  numeroSeguroSocial: string | null;
  contactoEmergencia: string | null;
  telefonoEmergencia: string | null;
  direccion: string | null;
  lesiones: string | null;
  tipoSangre: string | null;
  alergias: string | null;
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
    telefono: '', numeroSeguroSocial: '', contactoEmergencia: '', telefonoEmergencia: '',
    direccion: '', lesiones: '', tipoSangre: '', alergias: '',
  });

  useEffect(() => {
    if (!data) return;
    setF({
      telefono: data.telefono ?? '',
      numeroSeguroSocial: data.numeroSeguroSocial ?? '',
      contactoEmergencia: data.contactoEmergencia ?? '',
      telefonoEmergencia: data.telefonoEmergencia ?? '',
      direccion: data.direccion ?? '',
      lesiones: data.lesiones ?? '',
      tipoSangre: data.tipoSangre ?? '',
      alergias: data.alergias ?? '',
    });
  }, [data?.id]);

  const guardar = useMutation({
    mutationFn: () =>
      api.patch('/perfil', {
        telefono: f.telefono || null,
        numeroSeguroSocial: f.numeroSeguroSocial,
        contactoEmergencia: f.contactoEmergencia,
        telefonoEmergencia: f.telefonoEmergencia,
        direccion: f.direccion || null,
        lesiones: f.lesiones || null,
        tipoSangre: f.tipoSangre || null,
        alergias: f.alergias || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['perfil'] });
      setGuardado(true);
    },
  });

  if (isLoading) return <Cargando />;
  if (error) return <ErrorAviso error={error} />;
  if (!data) return null;

  const obligatoriosListos =
    f.numeroSeguroSocial.trim() && f.contactoEmergencia.trim() && f.telefonoEmergencia.trim();

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
          Falta tu <strong>NSS</strong> y tu <strong>contacto de emergencia</strong>. Sin eso no
          puedes inscribirte a una salida: son los datos que se llevan a campo.
        </div>
      )}
      {guardar.error != null && <ErrorAviso error={guardar.error} />}
      {guardado && <div className="aviso aviso-ok">Expediente actualizado.</div>}

      <section className="tarjeta" style={{ marginBottom: '1.5rem' }}>
        <div className="tarjeta-cuerpo">
          <h3>Datos para salidas</h3>

          <div className="campos-2">
            <div className="campo">
              <label htmlFor="p-nss">Número de Seguro Social *</label>
              <input id="p-nss" value={f.numeroSeguroSocial} inputMode="numeric"
                onChange={(e) => setF({ ...f, numeroSeguroSocial: e.target.value })} />
            </div>
            <div className="campo">
              <label htmlFor="p-tel">Tu teléfono</label>
              <input id="p-tel" type="tel" value={f.telefono}
                onChange={(e) => setF({ ...f, telefono: e.target.value })} />
            </div>
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
              <label htmlFor="p-sangre">Tipo de sangre</label>
              <input id="p-sangre" placeholder="O+" maxLength={5} value={f.tipoSangre}
                onChange={(e) => setF({ ...f, tipoSangre: e.target.value })} />
            </div>
            <div className="campo">
              <label htmlFor="p-alergias">Alergias</label>
              <input id="p-alergias" value={f.alergias}
                onChange={(e) => setF({ ...f, alergias: e.target.value })} />
            </div>
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

  const anios = Array.from({ length: anioActual - ANIO_MINIMO + 1 }, (_, i) => anioActual - i);
  const curso = cursos?.find((c) => c.id === f.courseId);
  const vistaPrevia = curso?.codigo ? `${curso.codigo}_${f.anio}${f.letra}` : null;

  return (
    <section className="tarjeta">
      <div className="tarjeta-cuerpo">
        <h3>Cursos que he tomado</h3>
        <p className="texto-suave" style={{ fontSize: '0.9rem' }}>
          Declara cada curso con su generación. El jefe del área correspondiente lo revisa; al
          aprobarlo quedas dentro de esa área.
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
                      <code style={{ fontWeight: 700, color: 'var(--guinda)' }}>
                        {d.course.codigo ?? '—'}_{d.anio}{d.letra}
                      </code>
                    </td>
                    <td>{d.course.nombre}</td>
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
                    </td>
                    <td>
                      {d.status === 'PENDIENTE' && (
                        <button type="button" className="btn btn-borde btn-sm"
                          onClick={() => retirar.mutate(d.id)} disabled={retirar.isPending}>
                          Retirar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {declarar.error != null && <ErrorAviso error={declarar.error} />}
        {retirar.error != null && <ErrorAviso error={retirar.error} />}

        <div style={{ borderTop: '1px solid var(--borde)', paddingTop: '1rem' }}>
          <h4 style={{ marginTop: 0 }}>Declarar un curso</h4>

          <div className="campos-2">
            <div className="campo">
              <label htmlFor="d-curso">Curso *</label>
              <select id="d-curso" value={f.courseId} onChange={(e) => setF({ ...f, courseId: e.target.value })}>
                <option value="">Elige un curso…</option>
                {cursos?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.codigo ? `${c.codigo} · ` : ''}{c.nombre}
                    {c.area ? ` — ${c.area.nombre}` : ''}
                  </option>
                ))}
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
