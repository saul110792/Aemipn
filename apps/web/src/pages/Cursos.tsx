import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Course } from '../lib/types';
import { Cargando, ErrorAviso, Insignia } from '../components/Estado';
import { etiqueta, fmtMoneda, fmtRango } from '../lib/format';

export function Cursos() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['public', 'cursos'],
    queryFn: () => api.get<Course[]>('/public/cursos'),
  });

  return (
    <div className="contenedor seccion">
      <h1>Cursos</h1>
      <p className="texto-suave" style={{ maxWidth: '62ch' }}>
        Formación técnica por área. Un miembro puede llevar tantos cursos como quiera; el historial
        queda registrado en su expediente.
      </p>

      {isLoading && <Cargando />}
      {error && <ErrorAviso error={error} />}

      <div className="rejilla rejilla-3" style={{ marginTop: '1.5rem' }}>
        {data?.map((c) => (
          <article key={c.id} className="tarjeta">
            <div className="tarjeta-franja" style={{ background: c.area?.color ?? 'var(--azul-700)' }} />
            <div className="tarjeta-cuerpo">
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
                <Insignia valor={c.kind} texto={etiqueta(c.kind)} />
                {c.area && <span className="insignia">{c.area.nombre}</span>}
              </div>
              <h3 style={{ fontSize: '1.05rem' }}>{c.nombre}</h3>
              {c.descripcion && (
                <p className="texto-suave" style={{ fontSize: '0.92rem' }}>{c.descripcion}</p>
              )}
              {c.requisitos && (
                <p className="texto-suave" style={{ fontSize: '0.87rem' }}>
                  <strong>Requisitos:</strong> {c.requisitos}
                </p>
              )}
              {c.duracionHoras && <span className="insignia">{c.duracionHoras} horas</span>}

              {c.ediciones && c.ediciones.length > 0 && (
                <div style={{ marginTop: '0.9rem', paddingTop: '0.9rem', borderTop: '1px solid var(--borde)' }}>
                  <strong style={{ fontSize: '0.85rem' }}>Inscripciones abiertas</strong>
                  {c.ediciones.map((e) => (
                    <div key={e.id} style={{ fontSize: '0.88rem' }} className="texto-suave">
                      {e.clave} · {fmtRango(e.fechaInicio, e.fechaFin)} · {fmtMoneda(e.costo)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
