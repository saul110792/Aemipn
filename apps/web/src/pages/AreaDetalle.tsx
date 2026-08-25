import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Cargando, ErrorAviso } from '../components/Estado';
import { etiqueta } from '../lib/format';
import { Icono, hayIcono } from '../components/Icono';

interface AreaPublica {
  id: string;
  slug: string;
  nombre: string;
  descripcion: string | null;
  contenido: string | null;
  color: string | null;
  cursos: { id: string; slug: string; nombre: string; descripcion: string | null; requisitos: string | null; duracionHoras: number | null }[];
  miembros: { role: string; hasta: string | null; member: { nombre: string; apellidoPaterno: string; fotoUrl: string | null } }[];
}

export function AreaDetalle() {
  const { slug } = useParams<{ slug: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ['public', 'area', slug],
    queryFn: () => api.get<AreaPublica>(`/public/areas/${slug}`),
    enabled: Boolean(slug),
  });

  if (isLoading) return <Cargando />;
  if (error) return <div className="contenedor seccion"><ErrorAviso error={error} /></div>;
  if (!data) return null;

  return (
    <>
      <header className="hero" style={{ background: data.color ?? undefined, paddingBottom: '3rem' }}>
        <div className="contenedor">
          <Link to="/areas" style={{ color: 'rgba(255,255,255,.8)', fontSize: '0.9rem' }}>
            ← Todas las áreas
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', marginTop: '0.75rem' }}>
            {hayIcono(data.slug) && (
              <span
                className="medallon"
                style={{ background: 'rgba(255,255,255,.16)', color: '#fff', marginBottom: 0, width: 56, height: 56 }}
              >
                <Icono nombre={data.slug} className="icono icono-lg" titulo={data.nombre} />
              </span>
            )}
            <h1 style={{ margin: 0 }}>{data.nombre}</h1>
          </div>
          <p>{data.descripcion}</p>
        </div>
      </header>

      <div className="contenedor seccion">
        {data.contenido && <p style={{ maxWidth: '70ch', fontSize: '1.05rem' }}>{data.contenido}</p>}

        {data.miembros.length > 0 && (
          <>
            <h2 style={{ marginTop: '2rem' }}>Mesa del área</h2>
            <div className="rejilla rejilla-4">
              {data.miembros.map((m, i) => (
                <div key={i} className="tarjeta">
                  <div className="tarjeta-cuerpo">
                    <span className="insignia insignia-azul">{etiqueta(m.role)}</span>
                    <h3 style={{ marginTop: '0.6rem', marginBottom: 0, fontSize: '1rem' }}>
                      {m.member.nombre} {m.member.apellidoPaterno}
                    </h3>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {data.cursos.length > 0 && (
          <>
            <h2 style={{ marginTop: '2.5rem' }}>Cursos del área</h2>
            <div className="rejilla rejilla-3">
              {data.cursos.map((c) => (
                <div key={c.id} className="tarjeta">
                  <div className="tarjeta-cuerpo">
                    <h3 style={{ fontSize: '1rem' }}>{c.nombre}</h3>
                    {c.descripcion && <p className="texto-suave" style={{ fontSize: '0.9rem' }}>{c.descripcion}</p>}
                    {c.duracionHoras && <span className="insignia">{c.duracionHoras} horas</span>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div style={{ marginTop: '2.5rem' }}>
          <Link to="/unete" className="btn btn-verde">
            Quiero unirme a {data.nombre}
          </Link>
        </div>
      </div>
    </>
  );
}
