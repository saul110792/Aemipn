import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { CourseEdition } from '../lib/types';
import { Cargando, ErrorAviso, Insignia } from '../components/Estado';
import { etiqueta, fmtFechaHora, fmtMoneda, fmtRango } from '../lib/format';

export function Cim() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['public', 'cim'],
    queryFn: () => api.get<CourseEdition[]>('/public/cim'),
  });

  return (
    <>
      <header className="hero">
        <div className="contenedor">
          <h1>Curso Introductorio al Montañismo</h1>
          <p>
            Un fin de semana, una salida por cada área. La forma más directa de conocer las ocho
            disciplinas de la AEMIPN y decidir dónde quieres integrarte. Se imparte tres o cuatro
            veces al año y no requiere experiencia previa.
          </p>
        </div>
      </header>

      <div className="contenedor seccion">
        <h2>Convocatorias</h2>

        {isLoading && <Cargando />}
        {error && <ErrorAviso error={error} />}

        {data?.length === 0 && (
          <div className="aviso aviso-info">
            No hay convocatorias abiertas en este momento. El CIM se abre tres o cuatro veces al
            año — deja tus datos en <Link to="/unete">Únete</Link> y te avisamos de la siguiente.
          </div>
        )}

        <div className="pila">
          {data?.map((ed) => (
            <article key={ed.id} className="tarjeta">
              <div className="tarjeta-cuerpo">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0 }}>{ed.clave}</h3>
                  <Insignia valor={ed.estado} texto={etiqueta(ed.estado)} />
                </div>

                <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: '0.75rem', margin: '1rem 0' }}>
                  <div>
                    <dt className="texto-suave" style={{ fontSize: '0.8rem' }}>Fechas</dt>
                    <dd style={{ margin: 0, fontWeight: 600 }}>{fmtRango(ed.fechaInicio, ed.fechaFin)}</dd>
                  </div>
                  {ed.sede && (
                    <div>
                      <dt className="texto-suave" style={{ fontSize: '0.8rem' }}>Sede</dt>
                      <dd style={{ margin: 0, fontWeight: 600 }}>{ed.sede}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="texto-suave" style={{ fontSize: '0.8rem' }}>Cuota de recuperación</dt>
                    <dd style={{ margin: 0, fontWeight: 600 }}>{fmtMoneda(ed.costo)}</dd>
                  </div>
                  {ed.lugaresRestantes !== null && ed.lugaresRestantes !== undefined && (
                    <div>
                      <dt className="texto-suave" style={{ fontSize: '0.8rem' }}>Lugares</dt>
                      <dd style={{ margin: 0, fontWeight: 600 }}>{ed.lugaresRestantes} disponibles</dd>
                    </div>
                  )}
                </dl>

                {ed.course?.requisitos && (
                  <p className="texto-suave" style={{ fontSize: '0.93rem' }}>
                    <strong>Requisitos:</strong> {ed.course.requisitos}
                  </p>
                )}

                {ed.actividades && ed.actividades.length > 0 && (
                  <>
                    <h4 style={{ marginTop: '1.25rem' }}>Salidas del fin de semana</h4>
                    <div className="tabla-envoltura">
                      <table>
                        <thead>
                          <tr>
                            <th>Área</th>
                            <th>Actividad</th>
                            <th>Cuándo</th>
                            <th>Dónde</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ed.actividades.map((a, i) => (
                            <tr key={i}>
                              <td>
                                <span
                                  className="insignia"
                                  style={{ background: a.area?.color ?? undefined, color: a.area?.color ? '#fff' : undefined }}
                                >
                                  {a.area?.nombre ?? 'General'}
                                </span>
                              </td>
                              <td>{a.titulo}</td>
                              <td className="texto-suave">{fmtFechaHora(a.fechaInicio)}</td>
                              <td className="texto-suave">{a.lugar ?? '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                <div style={{ marginTop: '1.25rem' }}>
                  <Link to="/unete" className="btn btn-verde">
                    Registrarme en el CIM
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </>
  );
}
