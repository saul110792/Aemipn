import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Area, Evento } from '../lib/types';
import { Cargando, ErrorAviso } from '../components/Estado';
import { TarjetaEvento } from '../components/TarjetaEvento';

export function Eventos() {
  const [areaId, setAreaId] = useState('');

  const { data: areas } = useQuery({
    queryKey: ['public', 'areas'],
    queryFn: () => api.get<Area[]>('/public/areas'),
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['public', 'eventos', areaId],
    queryFn: () => api.get<Evento[]>(`/public/eventos${areaId ? `?areaId=${areaId}` : ''}`),
  });

  return (
    <>
      <header className="hero" style={{ padding: '3rem 0 2.5rem' }}>
        <div className="contenedor">
          <h1>Próximos eventos</h1>
          <p>
            Cursos, talleres, salidas y convocatorias abiertas. Los hay presenciales y en línea;
            cada uno indica dónde es o por dónde conectarse.
          </p>
        </div>
      </header>

      <div className="contenedor seccion">
        <div className="barra-filtros">
          <label htmlFor="filtro-area" style={{ fontWeight: 600, fontSize: '0.9rem' }}>
            Filtrar por área
          </label>
          <select id="filtro-area" value={areaId} onChange={(e) => setAreaId(e.target.value)}>
            <option value="">Todas las áreas</option>
            {areas?.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
              </option>
            ))}
          </select>
        </div>

        {isLoading && <Cargando />}
        {error && <ErrorAviso error={error} />}

        {data?.length === 0 && (
          <div className="aviso aviso-info">
            No hay eventos públicos programados por ahora. Vuelve pronto o síguenos para
            enterarte de la próxima convocatoria.
          </div>
        )}

        <div className="pila">
          {data?.map((e) => (
            <TarjetaEvento key={e.id} evento={e} />
          ))}
        </div>
      </div>
    </>
  );
}
