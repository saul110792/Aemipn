import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Area } from '../lib/types';
import { Icono, hayIcono } from './Icono';

/**
 * Carrusel de areas con la foto de la actividad de fondo.
 * Cuando un area todavia no tiene foto se dibuja un panel ilustrado con su
 * color y su icono, para que la vista no se rompa ni se vea a medio hacer.
 */
export function CarruselAreas({ areas }: { areas: Area[] }) {
  const [indice, setIndice] = useState(0);
  const [pausado, setPausado] = useState(false);
  /// Coordenada X donde empezo un arrastre, para detectar el deslizamiento.
  const inicioX = useRef<number | null>(null);
  const total = areas.length;

  const ir = useCallback(
    (n: number) => setIndice(((n % total) + total) % total),
    [total],
  );

  // Avance automatico, en pausa mientras el cursor o el foco esten encima.
  useEffect(() => {
    if (pausado || total <= 1) return;
    const t = setInterval(() => setIndice((i) => (i + 1) % total), 6000);
    return () => clearInterval(t);
  }, [pausado, total]);


  if (!total) return null;

  // Deslizar con el dedo o el trackpad: mas de 50 px de arrastre cambia de area.
  const alSoltar = (e: React.PointerEvent) => {
    if (inicioX.current === null) return;
    const recorrido = e.clientX - inicioX.current;
    inicioX.current = null;
    if (Math.abs(recorrido) > 50) ir(indice + (recorrido < 0 ? 1 : -1));
  };

  const alTeclear = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); ir(indice + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); ir(indice - 1); }
  };

  return (
    <section
      className="carrusel"
      aria-roledescription="carrusel"
      aria-label="Áreas de la asociación"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocusCapture={() => setPausado(true)}
      onBlurCapture={() => setPausado(false)}
      onKeyDown={alTeclear}
      onPointerDown={(e) => { inicioX.current = e.clientX; }}
      onPointerUp={alSoltar}
      onPointerCancel={() => { inicioX.current = null; }}
    >
      <div className="carrusel-ventana">
        <div
          className="carrusel-pista"
          style={{ transform: `translateX(-${indice * 100}%)` }}
        >
          {areas.map((area, i) => (
            <Diapositiva key={area.id} area={area} activa={i === indice} posicion={i + 1} total={total} />
          ))}
        </div>
      </div>

      <button
        type="button"
        className="carrusel-flecha izq"
        onClick={() => ir(indice - 1)}
        aria-label="Área anterior"
      >
        ‹
      </button>
      <button
        type="button"
        className="carrusel-flecha der"
        onClick={() => ir(indice + 1)}
        aria-label="Área siguiente"
      >
        ›
      </button>

      <div className="carrusel-puntos" role="tablist" aria-label="Elegir área">
        {areas.map((area, i) => (
          <button
            key={area.id}
            type="button"
            role="tab"
            aria-selected={i === indice}
            aria-label={area.nombre}
            className={i === indice ? 'punto activo' : 'punto'}
            style={i === indice ? { background: area.color ?? 'var(--guinda)' } : undefined}
            onClick={() => ir(i)}
          />
        ))}
      </div>
    </section>
  );
}

function Diapositiva({
  area,
  activa,
  posicion,
  total,
}: {
  area: Area;
  activa: boolean;
  posicion: number;
  total: number;
}) {
  const color = area.color ?? '#611232';
  const foto = area.galeria?.[0] ?? area.imagenUrl ?? null;

  return (
    <article
      className="carrusel-slide"
      role="group"
      aria-roledescription="diapositiva"
      aria-label={`${posicion} de ${total}: ${area.nombre}`}
      aria-hidden={!activa}
      style={{ background: color }}
    >
      {foto ? (
        <img className="carrusel-foto" src={foto} alt="" loading="lazy" />
      ) : (
        <PanelIlustrado color={color} slug={area.slug} />
      )}

      <div className="carrusel-velo" />

      <div className="carrusel-texto">
        <span className="insignia" style={{ background: 'rgba(255,255,255,.2)', color: '#fff' }}>
          {hayIcono(area.slug) && <Icono nombre={area.slug} />}
          {area._count?.miembros ?? 0} miembros
        </span>
        <h3>{area.nombre}</h3>
        <p>{area.descripcion}</p>
        <Link
          to={`/areas/${area.slug}`}
          className="btn btn-claro"
          tabIndex={activa ? 0 : -1}
        >
          Conocer el área
        </Link>
      </div>
    </article>
  );
}

/** Relleno ilustrado para las areas que aun no tienen foto cargada. */
function PanelIlustrado({ color, slug }: { color: string; slug: string }) {
  return (
    <div className="carrusel-ilustrado" style={{ background: `linear-gradient(160deg, ${color} 0%, #2a0f1c 130%)` }}>
      <svg viewBox="0 0 400 260" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 260V186l58-52 44 38 62-74 55 66 47-40 74 62v74z" fill="#fff" opacity=".1" />
        <path d="M0 260v-46l70-44 52 34 58-52 66 58 54-36 100 58v28z" fill="#fff" opacity=".14" />
      </svg>
      {hayIcono(slug) && (
        <span className="carrusel-ilustrado-icono">
          <Icono nombre={slug} />
        </span>
      )}
    </div>
  );
}
