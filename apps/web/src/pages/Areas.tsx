import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Area } from '../lib/types';
import { Cargando, ErrorAviso } from '../components/Estado';
import { TarjetaArea } from '../components/TarjetaArea';
import { CarruselAreas } from '../components/CarruselAreas';

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

      {data && <CarruselAreas areas={data} />}

      <h2 style={{ marginTop: '2.5rem' }}>Todas las disciplinas</h2>
      <div className="rejilla rejilla-3" style={{ marginTop: '1.25rem' }}>
        {data?.map((area) => (
          <TarjetaArea key={area.id} area={area} />
        ))}
      </div>
    </div>
  );
}
