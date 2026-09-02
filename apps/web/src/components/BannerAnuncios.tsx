import { useCallback, useEffect, useRef, useState } from 'react';
import type { Anuncio } from '../lib/types';

/**
 * Banner de anuncios de la portada: felicitaciones, presentaciones de fin de
 * curso, exploraciones, organización — promocional, aparte de la agenda de
 * eventos (que sí tiene fecha y lugar). Mismo mecanismo que CarruselAreas.
 */
export function BannerAnuncios({ anuncios }: { anuncios: Anuncio[] }) {
  const [indice, setIndice] = useState(0);
  const [pausado, setPausado] = useState(false);
  const inicioX = useRef<number | null>(null);
  const total = anuncios.length;

  const ir = useCallback((n: number) => setIndice(((n % total) + total) % total), [total]);

  useEffect(() => {
    if (pausado || total <= 1) return;
    const t = setInterval(() => setIndice((i) => (i + 1) % total), 6000);
    return () => clearInterval(t);
  }, [pausado, total]);

  if (!total) return null;

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
      aria-label="Anuncios"
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
        <div className="carrusel-pista" style={{ transform: `translateX(-${indice * 100}%)` }}>
          {anuncios.map((a, i) => (
            <Diapositiva key={a.id} anuncio={a} activa={i === indice} posicion={i + 1} total={total} />
          ))}
        </div>
      </div>

      {total > 1 && (
        <>
          <button type="button" className="carrusel-flecha izq" onClick={() => ir(indice - 1)} aria-label="Anuncio anterior">
            ‹
          </button>
          <button type="button" className="carrusel-flecha der" onClick={() => ir(indice + 1)} aria-label="Anuncio siguiente">
            ›
          </button>

          <div className="carrusel-puntos" role="tablist" aria-label="Elegir anuncio">
            {anuncios.map((a, i) => (
              <button
                key={a.id}
                type="button"
                role="tab"
                aria-selected={i === indice}
                aria-label={a.titulo}
                className={i === indice ? 'punto activo' : 'punto'}
                onClick={() => ir(i)}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function Diapositiva({
  anuncio,
  activa,
  posicion,
  total,
}: {
  anuncio: Anuncio;
  activa: boolean;
  posicion: number;
  total: number;
}) {
  const color = '#611232';

  return (
    <article
      className="carrusel-slide"
      role="group"
      aria-roledescription="diapositiva"
      aria-label={`${posicion} de ${total}: ${anuncio.titulo}`}
      aria-hidden={!activa}
      style={{ background: color }}
    >
      {anuncio.imagenUrl ? (
        <img className="carrusel-foto" src={anuncio.imagenUrl} alt="" loading="lazy" />
      ) : (
        <div className="carrusel-ilustrado" style={{ background: `linear-gradient(160deg, ${color} 0%, #2a0f1c 130%)` }}>
          <svg viewBox="0 0 400 260" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 260V186l58-52 44 38 62-74 55 66 47-40 74 62v74z" fill="#fff" opacity=".1" />
            <path d="M0 260v-46l70-44 52 34 58-52 66 58 54-36 100 58v28z" fill="#fff" opacity=".14" />
          </svg>
        </div>
      )}

      <div className="carrusel-velo" />

      <div className="carrusel-texto">
        <span className="insignia" style={{ background: 'rgba(255,255,255,.2)', color: '#fff' }}>
          Anuncio
        </span>
        <h3>{anuncio.titulo}</h3>
        {anuncio.descripcion && <p>{anuncio.descripcion}</p>}
        {anuncio.enlaceUrl && (
          <a
            href={anuncio.enlaceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-claro"
            tabIndex={activa ? 0 : -1}
          >
            {anuncio.enlaceTexto || 'Ver más'}
          </a>
        )}
      </div>
    </article>
  );
}
