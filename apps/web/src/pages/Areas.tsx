import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Area } from '../lib/types';
import { Cargando, ErrorAviso } from '../components/Estado';

export function Areas() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['public', 'areas'],
    queryFn: () => api.get<Area[]>('/public/areas'),
  });

  return (
    <div className="contenedor seccion">
      <h1>Áreas de la asociación</h1>
      <p className="texto-suave" style={{ maxWidth: '62ch' }}>
        Ocho disciplinas, cada una con su mesa, su calendario y sus cursos técnicos.
      </p>

      {isLoading && <Cargando />}
      {error && <ErrorAviso error={error} />}

      <div className="rejilla rejilla-3" style={{ marginTop: '1.5rem' }}>
        {data?.map((area) => (
          <Link key={area.id} to={`/areas/${area.slug}`} className="tarjeta tarjeta-area">
            <div className="tarjeta-franja" style={{ background: area.color ?? undefined }} />
            <div className="tarjeta-cuerpo">
              <h3>{area.nombre}</h3>
              <p className="texto-suave" style={{ fontSize: '0.93rem', marginBottom: '0.75rem' }}>
                {area.descripcion}
              </p>
              <span className="insignia">{area._count?.miembros ?? 0} miembros</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
