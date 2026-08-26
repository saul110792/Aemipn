import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Cargando, ErrorAviso, Insignia } from '../../components/Estado';
import { etiqueta, fmtFecha, fmtFechaHora, fmtRango } from '../../lib/format';
import { Icono, hayIcono } from '../../components/Icono';
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
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<Resumen>('/dashboard'),
  });

  if (isLoading) return <Cargando />;
  if (error) return <ErrorAviso error={error} />;
  if (!data) return null;

  const esMesa = data.alcance === 'MESA';
  const misAreas = data.areasQueEncabeza.map((a) => a.nombre).join(' y ');

  return (
    <>
      <div className="panel-encabezado">
        <div>
          <h1>Resumen</h1>
          {!esMesa && (
            <p className="texto-suave" style={{ margin: 0 }}>
              Cifras de {misAreas || 'tu área'}.
            </p>
          )}
        </div>
      </div>

      <div className="rejilla rejilla-4">
        <Metrica
          icono="miembros"
          valor={data.miembros.total}
          etiqueta={esMesa ? 'Miembros registrados' : 'Miembros del área'}
        />
        <Metrica icono="brujula" valor={data.miembros.porStatus.ACTIVO ?? 0} etiqueta="Activos" />
        {esMesa ? (
          <Metrica icono="solicitudes" valor={data.solicitudesNuevas} etiqueta="Solicitudes por revisar" />
        ) : (
          <Metrica icono="solicitudes" valor={data.declaracionesPendientes} etiqueta="Cursos por validar" />
        )}
        <Metrica icono="pago" valor={data.pagosPendientes} etiqueta="Pagos pendientes" />
      </div>

      {esMesa && data.solicitudesNuevas > 0 && (
        <div className="aviso aviso-info" style={{ marginTop: '1.25rem' }}>
          Hay {data.solicitudesNuevas} solicitud(es) de ingreso esperando revisión.{' '}
          <Link to="/panel/solicitudes">Revisarlas ahora →</Link>
        </div>
      )}

      {!esMesa && data.declaracionesPendientes > 0 && (
        <div className="aviso aviso-info" style={{ marginTop: '1.25rem' }}>
          Tienes {data.declaracionesPendientes} declaración(es) de curso esperando tu visto bueno.{' '}
          <Link to="/panel/validaciones">Revisarlas ahora →</Link>
        </div>
      )}

      <h2 style={{ marginTop: '2rem' }}>{esMesa ? 'Miembros por área' : 'Tu área'}</h2>
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

      <h2 style={{ marginTop: '2rem' }}>Ediciones en marcha</h2>
      {data.edicionesActivas.length === 0 ? (
        <div className="vacio">
          No hay ediciones abiertas. <Link to="/panel/ediciones">Crear una →</Link>
        </div>
      ) : (
        <div className="tabla-envoltura">
          <table>
            <thead>
              <tr>
                <th>Clave</th>
                <th>Curso</th>
                <th>Fechas</th>
                <th>Inscritos</th>
                <th>Estado</th>
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

      <h2 style={{ marginTop: '2rem' }}>Próximas salidas</h2>
      {data.proximasActividades.length === 0 ? (
        <div className="vacio">Sin actividades programadas.</div>
      ) : (
        <div className="tabla-envoltura">
          <table>
            <thead>
              <tr>
                <th>Cuándo</th>
                <th>Actividad</th>
                <th>Área</th>
                <th>Edición</th>
                <th>Responsable</th>
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
                    {a.responsable ? `${a.responsable.nombre} ${a.responsable.apellidoPaterno}` : 'Sin asignar'}
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

/**
 * El CIM, visible para cualquier jefe encabece el área que encabece.
 *
 * De ahí sale la gente nueva y ahí cada área pone una salida, así que un jefe
 * necesita ver cuántos vienen y cuándo le toca, aunque todavía no sean suyos.
 */
function BloqueCim({ cim, esMesa }: { cim: Resumen['cim']; esMesa: boolean }) {
  const abiertas = cim.ediciones;

  return (
    <>
      <h2 style={{ marginTop: '2rem' }}>
        Curso Introductorio al Montañismo
        <span className="texto-suave" style={{ fontWeight: 400, fontSize: '.9rem' }}>
          {' '}— de aquí salen los nuevos miembros
        </span>
      </h2>

      {abiertas.length === 0 && cim.historial.length === 0 ? (
        <div className="vacio">
          No hay ediciones del CIM registradas. <Link to="/panel/ediciones">Programar una →</Link>
        </div>
      ) : (
        <>
          <div className="rejilla rejilla-4">
            <Metrica icono="miembros" valor={cim.interesados} etiqueta="Interesados en curso" />
            <Metrica icono="brujula" valor={cim.nuevos} etiqueta="Aún sin área" />
            <Metrica icono="cursos" valor={cim.porEstado.INSCRITO ?? 0} etiqueta="Inscripción confirmada" />
            <Metrica icono="cursos" valor={cim.porEstado.ACREDITADO ?? 0} etiqueta="Ya acreditados" />
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
                      {ed.inscritos} inscrito(s){ed.cupo ? ` de ${ed.cupo}` : ''}
                    </span>
                  </div>

                  {!esMesa && (
                    <p style={{ margin: '.75rem 0 0' }}>
                      {propias.length === 0 ? (
                        <span className="texto-suave">
                          Tu área no tiene salida asignada en esta edición.
                        </span>
                      ) : (
                        <>
                          Te toca:{' '}
                          {propias.map((s, i) => (
                            <span key={s.id}>
                              {i > 0 && ', '}
                              <strong>{s.titulo}</strong> el {fmtFecha(s.fechaInicio)}
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
              <h3 style={{ marginTop: '1.5rem', fontSize: '1rem' }}>Ediciones anteriores</h3>
              <div className="tabla-envoltura">
                <table>
                  <thead>
                    <tr>
                      <th>Clave</th>
                      <th>Inició</th>
                      <th>Inscritos</th>
                      <th>Acreditaron</th>
                      <th>Desertaron</th>
                      <th>Reprobaron</th>
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
