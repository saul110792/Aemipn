import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { Course } from '../../lib/types';
import { Cargando, ErrorAviso, Insignia } from '../../components/Estado';
import { etiqueta } from '../../lib/format';

interface CursoConteo extends Course {
  _count: { ediciones: number };
}

export function CursosPanel() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['courses'],
    queryFn: () => api.get<CursoConteo[]>('/courses'),
  });

  if (isLoading) return <Cargando />;
  if (error) return <ErrorAviso error={error} />;

  return (
    <>
      <div className="panel-encabezado">
        <h1>Catálogo de cursos</h1>
      </div>

      <div className="tabla-envoltura">
        <table>
          <thead>
            <tr>
              <th>Curso</th>
              <th>Tipo</th>
              <th>Área</th>
              <th>Horas</th>
              <th>Ediciones</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((c) => (
              <tr key={c.id}>
                <td><strong>{c.nombre}</strong></td>
                <td><Insignia valor={c.kind} texto={etiqueta(c.kind)} /></td>
                <td>{c.area?.nombre ?? <span className="texto-suave">Transversal</span>}</td>
                <td>{c.duracionHoras ?? '—'}</td>
                <td>{c._count.ediciones}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
