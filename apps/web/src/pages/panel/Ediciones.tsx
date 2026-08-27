import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { CourseEdition } from '../../lib/types';
import { Cargando, ErrorAviso, Insignia } from '../../components/Estado';
import { etiqueta, fmtRango } from '../../lib/format';
import { FormularioEdicion } from '../../components/FormularioEdicion';
import { useAuth } from '../../lib/auth';

export function Ediciones() {
  const { esAdmin } = useAuth();
  const navegar = useNavigate();
  const [creando, setCreando] = useState(false);

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
        {esAdmin && (
          <button type="button" className="btn" onClick={() => setCreando((v) => !v)}>
            {creando ? 'Cancelar' : 'Nueva edición'}
          </button>
        )}
      </div>

      {creando && (
        <FormularioEdicion
          onListo={(e) => {
            setCreando(false);
            navegar(`/panel/ediciones/${e.id}`);
          }}
        />
      )}

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
              <th>Área</th>
              <th>Curso</th>
              <th>Fechas</th>
              <th>Sede</th>
              <th>Inscritos</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((ed) => (
              <tr key={ed.id}>
                <td>
                  <Link to={`/panel/ediciones/${ed.id}`}><strong>{ed.clave}</strong></Link>
                </td>
                <td className="texto-suave">
                  {ed.course?.area?.nombre ?? 'Transversal'}
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
                <td><Insignia valor={ed.estado} texto={etiqueta(ed.estado)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
