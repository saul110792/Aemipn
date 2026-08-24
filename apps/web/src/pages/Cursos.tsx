import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Course } from '../lib/types';
import { Cargando, ErrorAviso, Insignia } from '../components/Estado';
import { etiquetaTipoCurso, fmtMoneda, fmtRango } from '../lib/format';

/** El sitio publico tambien separa las tres cosas: no son equivalentes. */
const SECCIONES = [
  {
    kind: 'CIM',
    titulo: 'Curso introductorio',
    entrada: 'La puerta de entrada a la asociación. Un fin de semana con una salida de cada área.',
  },
  {
    kind: 'AREA',
    titulo: 'Cursos de área',
    entrada: 'Uno por disciplina. Acreditarlo es lo que integra formalmente a esa área.',
  },
  {
    kind: 'TALLER',
    titulo: 'Talleres',
    entrada: 'Formación complementaria dentro de cada área, más corta y específica.',
  },
  {
    kind: 'CERTIFICACION',
    titulo: 'Certificaciones',
    entrada: 'Acreditaciones formales reconocidas fuera de la asociación.',
  },
] as const;

export function Cursos() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['public', 'cursos'],
    queryFn: () => api.get<Course[]>('/public/cursos'),
  });

  return (
    <div className="contenedor seccion">
      <h1>Cursos y talleres</h1>
      <p className="texto-suave" style={{ maxWidth: '62ch' }}>
        Cada área tiene su curso propio, que es el que integra a ella, y varios talleres de
        formación complementaria. El historial queda en el expediente de cada miembro.
      </p>

      {isLoading && <Cargando />}
      {error && <ErrorAviso error={error} />}

      {SECCIONES.map(({ kind, titulo, entrada }) => {
        const delGrupo = (data ?? []).filter((c) => c.kind === kind);
        if (delGrupo.length === 0) return null;
        return (
          <section key={kind} style={{ marginTop: '2.5rem' }}>
            <h2>{titulo}</h2>
            <p className="texto-suave" style={{ maxWidth: '62ch' }}>{entrada}</p>
            <div className="rejilla rejilla-3" style={{ marginTop: '1.25rem' }}>
              {delGrupo.map((c) => (
          <article key={c.id} className="tarjeta">
            <div className="tarjeta-franja" style={{ background: c.area?.color ?? 'var(--azul-700)' }} />
            <div className="tarjeta-cuerpo">
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
                <Insignia valor={c.kind} texto={etiquetaTipoCurso(c.kind)} />
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
          </section>
        );
      })}
    </div>
  );
}
