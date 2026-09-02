import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { Cargando, ErrorAviso, Insignia } from '../../components/Estado';
import { etiqueta, fmtFecha, fmtFechaHora, fmtRango } from '../../lib/format';
import { Icono, hayIcono } from '../../components/Icono';
import { Emblema } from '../../components/Marca';
import { AvisoBeta } from '../../components/AvisoBeta';
import type { CourseEdition, EditionActivity } from '../../lib/types';

interface SalidaCim {
  id: string;
  titulo: string;
  fechaInicio: string;
  area: { id: string; nombre: string; slug: string; color: string | null } | null;
  propia?: boolean;
}

interface EdicionCim {
  id: string;
  clave: string;
  estado: string;
  fechaInicio: string;
  fechaFin: string;
  inscritos: number;
  cupo: number | null;
  misSalidas: SalidaCim[];
  salidas: SalidaCim[];
}

interface Resumen {
  alcance: 'MESA' | 'AREA';
  areasQueEncabeza: { id: string; nombre: string }[];
  miembros: { total: number; porStatus: Record<string, number> };
  areas: { id: string; nombre: string; slug: string; color: string | null; miembros: number }[];
  solicitudesNuevas: number;
  declaracionesPendientes: number;
  edicionesActivas: CourseEdition[];
  pagosPendientes: number;
  proximasActividades: EditionActivity[];
  cim: {
    interesados: number;
    nuevos: number;
    porEstado: Record<string, number>;
    ediciones: EdicionCim[];
    historial: { id: string; clave: string; estado: string; fechaInicio: string; total: number; porEstado: Record<string, number> }[];
  };
}

export function Dashboard() {
  const { t } = useTranslation();
  const { user, esAdmin } = useAuth();
  // El resumen es para quien dirige: la mesa directiva y quien encabeza un
  // area. La API lo rechaza igual para cualquier otro, asi que ni se pide.
  const puedeVerResumen = esAdmin || (user?.areasQueEncabeza ?? 0) > 0;

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<Resumen>('/dashboard'),
    enabled: puedeVerResumen,
  });

  if (!puedeVerResumen) {
    return (
      <>
        <AvisoBeta />
        <BienvenidaMiembro />
      </>
    );
  }
  if (isLoading) return <Cargando />;
  if (error) return <ErrorAviso error={error} />;
  if (!data) return null;

  const esMesa = data.alcance === 'MESA';
  const misAreas = data.areasQueEncabeza.map((a) => a.nombre).join(' y ');

  return (
    <>
      <AvisoBeta />
      <div className="panel-encabezado">
        <div>
          <h1>{t('dashboard.titulo')}</h1>
          {!esMesa && (
            <p className="texto-suave" style={{ margin: 0 }}>
              {t('dashboard.cifrasDeArea', { area: misAreas || t('dashboard.tuArea') })}
            </p>
          )}
        </div>
      </div>

      <div className="rejilla rejilla-4">
        <Metrica
          icono="miembros"
          valor={data.miembros.total}
          etiqueta={esMesa ? t('dashboard.miembrosRegistrados') : t('dashboard.miembrosDelArea')}
        />
        <Metrica icono="brujula" valor={data.miembros.porStatus.ACTIVO ?? 0} etiqueta={t('dashboard.activos')} />
        {esMesa ? (
          <Metrica icono="solicitudes" valor={data.solicitudesNuevas} etiqueta={t('dashboard.solicitudesPorRevisar')} />
        ) : (
          <Metrica icono="solicitudes" valor={data.declaracionesPendientes} etiqueta={t('dashboard.cursosPorValidar')} />
        )}
        <Metrica icono="pago" valor={data.pagosPendientes} etiqueta={t('dashboard.pagosPendientes')} />
      </div>

      {esMesa && data.solicitudesNuevas > 0 && (
        <div className="aviso aviso-info" style={{ marginTop: '1.25rem' }}>
          {t('dashboard.solicitudesNuevas', { count: data.solicitudesNuevas })}{' '}
          <Link to="/panel/solicitudes">{t('dashboard.revisarlasAhora')}</Link>
        </div>
      )}

      {!esMesa && data.declaracionesPendientes > 0 && (
        <div className="aviso aviso-info" style={{ marginTop: '1.25rem' }}>
          {t('dashboard.declaracionesPendientes', { count: data.declaracionesPendientes })}{' '}
          <Link to="/panel/validaciones">{t('dashboard.revisarlasAhora')}</Link>
        </div>
      )}

      <h2 style={{ marginTop: '2rem' }}>{esMesa ? t('dashboard.miembrosPorArea') : t('dashboard.tuAreaTitulo')}</h2>
      <div className="rejilla rejilla-4">
        {data.areas.map((a) => (
          <div key={a.id} className="metrica" style={{ borderLeft: `4px solid ${a.color ?? 'var(--roca)'}` }}>
            <div className="metrica-icono">
              {hayIcono(a.slug) && (
                <span style={{ color: a.color ?? 'var(--guinda)' }}>
                  <Icono nombre={a.slug} className="icono icono-lg" />
                </span>
              )}
              <div>
                <div className="valor" style={{ fontSize: '1.6rem' }}>{a.miembros}</div>
                <div className="etiqueta">{a.nombre}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <BloqueCim cim={data.cim} esMesa={esMesa} />

      <h2 style={{ marginTop: '2rem' }}>{t('dashboard.edicionesEnMarcha')}</h2>
      {data.edicionesActivas.length === 0 ? (
        <div className="vacio">
          {t('dashboard.sinEdicionesAbiertas')} <Link to="/panel/ediciones">{t('dashboard.crearUna')}</Link>
        </div>
      ) : (
        <div className="tabla-envoltura">
          <table>
            <thead>
              <tr>
                <th>{t('dashboard.clave')}</th>
                <th>{t('dashboard.curso')}</th>
                <th>{t('dashboard.fechas')}</th>
                <th>{t('dashboard.inscritosCol')}</th>
                <th>{t('dashboard.estado')}</th>
              </tr>
            </thead>
            <tbody>
              {data.edicionesActivas.map((ed) => (
                <tr key={ed.id}>
                  <td>
                    <Link to={`/panel/ediciones/${ed.id}`}>
                      <strong>{ed.clave}</strong>
                    </Link>
                  </td>
                  <td>{ed.course?.nombre}</td>
                  <td className="texto-suave">{fmtRango(ed.fechaInicio, ed.fechaFin)}</td>
                  <td>
                    {ed._count?.inscripciones ?? 0}
                    {ed.cupo ? ` / ${ed.cupo}` : ''}
                  </td>
                  <td>
                    <Insignia valor={ed.estado} texto={etiqueta(ed.estado)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 style={{ marginTop: '2rem' }}>{t('dashboard.proximasSalidas')}</h2>
      {data.proximasActividades.length === 0 ? (
        <div className="vacio">{t('dashboard.sinActividades')}</div>
      ) : (
        <div className="tabla-envoltura">
          <table>
            <thead>
              <tr>
                <th>{t('dashboard.cuando')}</th>
                <th>{t('dashboard.actividad')}</th>
                <th>{t('dashboard.area')}</th>
                <th>{t('dashboard.edicion')}</th>
                <th>{t('dashboard.responsable')}</th>
              </tr>
            </thead>
            <tbody>
              {data.proximasActividades.map((a) => (
                <tr key={a.id}>
                  <td className="texto-suave">{fmtFechaHora(a.fechaInicio)}</td>
                  <td>{a.titulo}</td>
                  <td>{a.area?.nombre ?? '—'}</td>
                  <td className="texto-suave">{a.edition?.clave}</td>
                  <td className="texto-suave">
                    {a.responsable ? `${a.responsable.nombre} ${a.responsable.apellidoPaterno}` : t('dashboard.sinAsignar')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

interface SalidaCimPublica {
  titulo: string;
  fechaInicio: string;
  lugar: string | null;
  area: { nombre: string; slug: string; color: string | null } | null;
}

interface EdicionCimPublica {
  id: string;
  clave: string;
  actividades: SalidaCimPublica[];
}

/**
 * Aviso para "no se te olvide apoyar en el CIM", con las salidas que
 * todavía faltan. Sin sesión de por medio: /public/cim ya trae justo lo que
 * el sitio informativo muestra, así que un miembro raso lo ve igual.
 */
function AvisoCim() {
  const { t } = useTranslation();
  const { data } = useQuery({
    queryKey: ['public', 'cim'],
    queryFn: () => api.get<EdicionCimPublica[]>('/public/cim'),
  });

  const ahora = Date.now();
  const restantes = (data ?? []).flatMap((e) => e.actividades)
    .filter((a) => new Date(a.fechaInicio).getTime() >= ahora)
    .sort((a, b) => new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime());

  // Sin convocatoria abierta no hay nada que recordar: el enlace de siempre.
  if (!data || data.length === 0) {
    return (
      <Link to="/cim" className="btn btn-borde">
        <Icono nombre="brujula" /> {t('cim.conoceElCim')}
      </Link>
    );
  }

  const visibles = restantes.slice(0, 3);
  const faltan = restantes.length - visibles.length;

  return (
    <div className="aviso aviso-info" style={{ marginBottom: 0, textAlign: 'left' }}>
      <strong>
        <Icono nombre="brujula" /> {t('cim.noOlvides')}
      </strong>
      {visibles.length > 0 ? (
        <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.2rem' }}>
          {visibles.map((s, i) => (
            <li key={i}>
              {s.area?.nombre ? `${s.area.nombre}: ` : ''}
              <strong>{s.titulo}</strong> — {fmtFecha(s.fechaInicio)}
            </li>
          ))}
          {faltan > 0 && <li className="texto-suave">{t('cim.yMas', { count: faltan })}</li>}
        </ul>
      ) : (
        <p style={{ margin: '0.35rem 0 0' }}>{t('cim.sinSalidasPendientes')}</p>
      )}
      <Link to="/cim" style={{ display: 'inline-block', marginTop: '0.5rem', fontSize: '0.88rem' }}>
        {t('cim.verConvocatoria')}
      </Link>
    </div>
  );
}

/**
 * Lo que ve quien todavía no encabeza nada: el resumen de la asociación no
 * es asunto suyo, pero llegar a un error en rojo el primer día que entra al
 * panel es peor bienvenida que no mostrarle nada.
 */
function BienvenidaMiembro() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const primerNombre = user?.nombre?.split(' ')[0];

  return (
    <div className="tarjeta" style={{ maxWidth: 560, margin: '2.5rem auto', textAlign: 'center' }}>
      <div className="tarjeta-cuerpo" style={{ padding: '2.5rem 2rem' }}>
        <Emblema tamano={52} />
        <h1 style={{ marginTop: '1rem', fontSize: '1.4rem' }}>
          {primerNombre ? t('bienvenida.titulo', { nombre: primerNombre }) : t('bienvenida.tituloSinNombre')}
        </h1>
        <p className="texto-suave" style={{ maxWidth: '38ch', margin: '0 auto' }}>
          {t('bienvenida.subtitulo')}
        </p>

        <div className="pila" style={{ textAlign: 'left', marginTop: '1.75rem' }}>
          <Link to="/panel/perfil" className="btn btn-verde">
            <Icono nombre="miembros" /> {t('bienvenida.completarExpediente')}
          </Link>
          {/* btn-peligro es la unica roja del sistema; aqui es solo color, no advertencia. */}
          <Link to="/panel/calendario" className="btn btn-peligro">
            <Icono nombre="calendario" /> {t('bienvenida.verCalendario')}
          </Link>
          <AvisoCim />
        </div>
      </div>
    </div>
  );
}

/**
 * El CIM, visible para cualquier jefe encabece el área que encabece.
 *
 * De ahí sale la gente nueva y ahí cada área pone una salida, así que un jefe
 * necesita ver cuántos vienen y cuándo le toca, aunque todavía no sean suyos.
 */
function BloqueCim({ cim, esMesa }: { cim: Resumen['cim']; esMesa: boolean }) {
  const { t } = useTranslation();
  const abiertas = cim.ediciones;

  return (
    <>
      <h2 style={{ marginTop: '2rem' }}>
        {t('dashboard.cimTitulo')}
        <span className="texto-suave" style={{ fontWeight: 400, fontSize: '.9rem' }}>
          {' '}{t('dashboard.cimSubtitulo')}
        </span>
      </h2>

      {abiertas.length === 0 && cim.historial.length === 0 ? (
        <div className="vacio">
          {t('dashboard.cimSinEdiciones')} <Link to="/panel/ediciones">{t('dashboard.programarUna')}</Link>
        </div>
      ) : (
        <>
          <div className="rejilla rejilla-4">
            <Metrica icono="miembros" valor={cim.interesados} etiqueta={t('dashboard.interesadosEnCurso')} />
            <Metrica icono="brujula" valor={cim.nuevos} etiqueta={t('dashboard.aunSinArea')} />
            <Metrica icono="cursos" valor={cim.porEstado.INSCRITO ?? 0} etiqueta={t('dashboard.inscripcionConfirmada')} />
            <Metrica icono="cursos" valor={cim.porEstado.ACREDITADO ?? 0} etiqueta={t('dashboard.yaAcreditados')} />
          </div>

          {abiertas.map((ed) => {
            const propias = esMesa ? [] : ed.misSalidas;
            return (
              <div key={ed.id} className="tarjeta" style={{ marginTop: '1rem' }}>
                <div className="tarjeta-cuerpo">
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.75rem', alignItems: 'baseline' }}>
                    <Link to={`/panel/ediciones/${ed.id}`}>
                      <strong>{ed.clave}</strong>
                    </Link>
                    <Insignia valor={ed.estado} texto={etiqueta(ed.estado)} />
                    <span className="texto-suave">{fmtRango(ed.fechaInicio, ed.fechaFin)}</span>
                    <span className="texto-suave">
                      {t('dashboard.inscritos', { count: ed.inscritos })}
                      {ed.cupo ? t('dashboard.deCupo', { cupo: ed.cupo }) : ''}
                    </span>
                  </div>

                  {!esMesa && (
                    <p style={{ margin: '.75rem 0 0' }}>
                      {propias.length === 0 ? (
                        <span className="texto-suave">
                          {t('dashboard.sinSalidaAsignada')}
                        </span>
                      ) : (
                        <>
                          {t('dashboard.teToca')}
                          {propias.map((s, i) => (
                            <span key={s.id}>
                              {i > 0 && ', '}
                              <strong>{s.titulo}</strong>{t('dashboard.elDia', { fecha: fmtFecha(s.fechaInicio) })}
                            </span>
                          ))}
                        </>
                      )}
                    </p>
                  )}

                  {ed.salidas.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem', marginTop: '.75rem' }}>
                      {ed.salidas.map((s) => (
                        <span
                          key={s.id}
                          className="insignia"
                          title={fmtFechaHora(s.fechaInicio)}
                          style={
                            s.propia
                              ? { background: `${s.area?.color ?? '#611232'}26`, color: s.area?.color ?? undefined, fontWeight: 700 }
                              : undefined
                          }
                        >
                          {s.area && hayIcono(s.area.slug) && <Icono nombre={s.area.slug} />}
                          {s.area?.nombre ?? s.titulo} · {fmtFecha(s.fechaInicio)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {cim.historial.length > 0 && (
            <>
              <h3 style={{ marginTop: '1.5rem', fontSize: '1rem' }}>{t('dashboard.edicionesAnteriores')}</h3>
              <div className="tabla-envoltura">
                <table>
                  <thead>
                    <tr>
                      <th>{t('dashboard.clave')}</th>
                      <th>{t('dashboard.inicio')}</th>
                      <th>{t('dashboard.inscritosCol')}</th>
                      <th>{t('dashboard.acreditaron')}</th>
                      <th>{t('dashboard.desertaron')}</th>
                      <th>{t('dashboard.reprobaron')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cim.historial.map((e) => (
                      <tr key={e.id}>
                        <td>
                          <Link to={`/panel/ediciones/${e.id}`}>{e.clave}</Link>
                        </td>
                        <td className="texto-suave">{fmtFecha(e.fechaInicio)}</td>
                        <td>{e.total}</td>
                        <td>{e.porEstado.ACREDITADO ?? 0}</td>
                        <td>{e.porEstado.DESERTO ?? 0}</td>
                        <td>{e.porEstado.NO_ACREDITADO ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}

/** Tarjeta de cifra con icono, para el bloque superior del resumen. */
function Metrica({
  icono,
  valor,
  etiqueta,
}: {
  icono: 'miembros' | 'brujula' | 'solicitudes' | 'pago' | 'cursos';
  valor: number;
  etiqueta: string;
}) {
  return (
    <div className="metrica">
      <div className="metrica-icono">
        <span style={{ color: 'var(--guinda-500)' }}>
          <Icono nombre={icono} className="icono icono-lg" />
        </span>
        <div>
          <div className="valor">{valor}</div>
          <div className="etiqueta">{etiqueta}</div>
        </div>
      </div>
    </div>
  );
}
