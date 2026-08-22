import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Area, CourseEdition, Evento } from '../lib/types';
import { fmtRango } from '../lib/format';
import { TarjetaArea } from '../components/TarjetaArea';
import { Icono } from '../components/Icono';
import { TarjetaEvento } from '../components/TarjetaEvento';

export function Inicio() {
  const { data: areas } = useQuery({
    queryKey: ['public', 'areas'],
    queryFn: () => api.get<Area[]>('/public/areas'),
  });

  const { data: cim } = useQuery({
    queryKey: ['public', 'cim'],
    queryFn: () => api.get<CourseEdition[]>('/public/cim'),
  });

  const { data: eventos } = useQuery({
    queryKey: ['public', 'eventos', 'portada'],
    queryFn: () => api.get<Evento[]>('/public/eventos?limite=3'),
  });

  const proxima = cim?.[0];

  return (
    <>
      <header className="hero">
        <div className="contenedor">
          <h1>La montaña empieza en el Politécnico</h1>
          <p>
            Somos la Asociación de Excursionismo y Montañismo del IPN. Ocho disciplinas, una
            comunidad y un curso introductorio que abre la puerta a todas ellas.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1.5rem' }}>
            <Link to="/unete" className="btn btn-claro">
              <Icono nombre="miembros" /> Quiero unirme
            </Link>
            <Link to="/cim" className="btn btn-verde">
              <Icono nombre="brujula" /> Conocer el CIM
            </Link>
          </div>
        </div>
      </header>

      {proxima && (
        <section style={{ background: '#fff', borderBottom: '1px solid var(--borde)', padding: '1.25rem 0' }}>
          <div className="contenedor" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <span className="insignia insignia-verde">
              <Icono nombre="calendario" /> Convocatoria abierta
            </span>
            <strong>{proxima.clave}</strong>
            <span className="texto-suave">{fmtRango(proxima.fechaInicio, proxima.fechaFin)}</span>
            {proxima.lugaresRestantes !== null && proxima.lugaresRestantes !== undefined && (
              <span className="texto-suave">{proxima.lugaresRestantes} lugares disponibles</span>
            )}
            <Link to="/cim" className="btn btn-sm" style={{ marginLeft: 'auto' }}>
              Ver detalles
            </Link>
          </div>
        </section>
      )}

      <section className="seccion">
        <div className="contenedor">
          <h2>Nuestras áreas</h2>
          <p className="texto-suave" style={{ maxWidth: '62ch' }}>
            Cada área tiene su jefe, su tesorero y su propio calendario de salidas y cursos. Puedes
            pertenecer a más de una.
          </p>

          <div className="rejilla rejilla-3" style={{ marginTop: '1.5rem' }}>
            {areas?.map((area) => (
              <TarjetaArea key={area.id} area={area} />
            ))}
          </div>
        </div>
      </section>

      {eventos && eventos.length > 0 && (
        <section className="seccion" style={{ background: '#fff', borderTop: '1px solid var(--borde)' }}>
          <div className="contenedor">
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0 }}>Próximos eventos</h2>
              <Link to="/eventos">Ver todos →</Link>
            </div>
            <div className="pila" style={{ marginTop: '1.25rem' }}>
              {eventos.map((e) => (
                <TarjetaEvento key={e.id} evento={e} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="seccion" style={{ background: 'var(--arena)', borderTop: '1px solid var(--borde)' }}>
        <div className="contenedor">
          <h2>¿Nunca has ido a la montaña?</h2>
          <p style={{ maxWidth: '62ch' }}>
            El <strong>Curso Introductorio al Montañismo (CIM)</strong> se imparte tres o cuatro
            veces al año en un fin de semana. Incluye una salida de cada área, para que conozcas de
            primera mano de qué trata cada disciplina antes de decidir dónde integrarte.
          </p>
          <Link to="/cim" className="btn">
            Ver próxima convocatoria
          </Link>
        </div>
      </section>
    </>
  );
}
