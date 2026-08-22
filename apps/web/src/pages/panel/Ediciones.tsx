import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { CourseEdition } from '../../lib/types';
import { Cargando, ErrorAviso, Insignia } from '../../components/Estado';
import { etiqueta, fmtMoneda, fmtRango } from '../../lib/format';

export function Ediciones() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['editions'],
    queryFn: () => api.get<CourseEdition[]>('/editions'),
  });

  if (isLoading) return <Cargando />;
  if (error) return <ErrorAviso error={error} />;

  return (
    <>
      <div className="panel-encabezado">
        <h1>Ediciones y CIM</h1>
      </div>

      <p className="texto-suave" style={{ maxWidth: '68ch' }}>
        Cada edición es una impartición concreta de un curso. El CIM tiene tres o cuatro al año, y
        cada una lleva una salida por área.
      </p>

      {data?.length === 0 && <div className="vacio">Todavía no hay ediciones registradas.</div>}

      <div className="tabla-envoltura">
        <table>
          <thead>
            <tr>
              <th>Clave</th>
              <th>Curso</th>
              <th>Fechas</th>
              <th>Sede</th>
              <th>Inscritos</th>
              <th>Costo</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((ed) => (
              <tr key={ed.id}>
                <td>
                  <Link to={`/panel/ediciones/${ed.id}`}><strong>{ed.clave}</strong></Link>
                </td>
                <td>
                  {ed.course?.nombre}
                  {ed.course?.kind === 'CIM' && <> <Insignia valor="CIM" texto="CIM" /></>}
                </td>
                <td className="texto-suave">{fmtRango(ed.fechaInicio, ed.fechaFin)}</td>
                <td className="texto-suave">{ed.sede ?? '—'}</td>
                <td>
                  {ed._count?.inscripciones ?? 0}
                  {ed.cupo ? ` / ${ed.cupo}` : ''}
                </td>
                <td>{fmtMoneda(ed.costo)}</td>
                <td><Insignia valor={ed.estado} texto={etiqueta(ed.estado)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
