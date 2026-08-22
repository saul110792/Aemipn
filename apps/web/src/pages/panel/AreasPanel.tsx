import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { Area } from '../../lib/types';
import { Cargando, ErrorAviso } from '../../components/Estado';

interface AreaConteo extends Area {
  _count: { miembros: number; cursos: number };
}

export function AreasPanel() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['areas'],
    queryFn: () => api.get<AreaConteo[]>('/areas'),
  });

  if (isLoading) return <Cargando />;
  if (error) return <ErrorAviso error={error} />;

  return (
    <>
      <div className="panel-encabezado">
        <h1>Áreas</h1>
      </div>

      <div className="rejilla rejilla-3">
        {data?.map((a) => (
          <article key={a.id} className="tarjeta">
            <div className="tarjeta-franja" style={{ background: a.color ?? undefined }} />
            <div className="tarjeta-cuerpo">
              <h3 style={{ fontSize: '1.05rem' }}>{a.nombre}</h3>
              <p className="texto-suave" style={{ fontSize: '0.9rem' }}>{a.descripcion}</p>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <span className="insignia">{a._count.miembros} miembros</span>
                <span className="insignia">{a._count.cursos} cursos</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
