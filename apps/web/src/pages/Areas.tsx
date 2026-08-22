import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Area } from '../lib/types';
import { Cargando, ErrorAviso } from '../components/Estado';
import { TarjetaArea } from '../components/TarjetaArea';

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
          <TarjetaArea key={area.id} area={area} />
        ))}
      </div>
    </div>
  );
}
