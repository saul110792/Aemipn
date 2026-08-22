import { useState } from 'react';

/**
 * Escudo de la AEMIPN para la barra superior.
 * Carga /escudo-aemipn.png (o .svg) si está presente; si no, dibuja un escudo
 * propio en SVG para que la barra nunca se vea rota.
 */
export function Emblema({ tamano = 36 }: { tamano?: number }) {
  const [falloImagen, setFalloImagen] = useState(false);

  if (!falloImagen) {
    return (
      <img
        src="/escudo-aemipn.png"
        alt=""
        className="emblema"
        style={{ width: tamano, height: tamano }}
        onError={() => setFalloImagen(true)}
      />
    );
  }

  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 48 48"
      className="emblema"
      role="img"
      aria-label="Emblema de la AEMIPN"
      fill="none"
    >
      <path
        d="M24 2.5l17 5.5v16.5c0 10.4-7 18-17 21.5-10-3.5-17-11.1-17-21.5V8z"
        fill="currentColor"
        opacity="0.16"
      />
      <path
        d="M24 2.5l17 5.5v16.5c0 10.4-7 18-17 21.5-10-3.5-17-11.1-17-21.5V8z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M11 31l6.5-11 4 6.5 4.5-9.5L34 31z" fill="currentColor" />
      <path d="M24.2 18.6l2.1 4.4-2.3 1-2 -1z" fill="#ffffff" opacity="0.85" />
      <path d="M10 34.5h28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Bloque de marca de la barra superior. */
export function Marca({ subtitulo = 'Excursionismo y Montañismo · IPN' }: { subtitulo?: string }) {
  return (
    <>
      <Emblema />
      <span className="marca-texto">
        AEMIPN
        <span>{subtitulo}</span>
      </span>
    </>
  );
}

/**
 * Escudo institucional del IPN, para el pie del sitio.
 * `blanco` usa la variante monocromática, legible sobre el guinda oscuro.
 */
export function LogoIPN({ ancho = 210, blanco = true }: { ancho?: number; blanco?: boolean }) {
  return (
    <img
      src={blanco ? '/logo-ipn-blanco.svg' : '/logo-ipn.svg'}
      alt="Instituto Politécnico Nacional"
      width={ancho}
      className="logo-ipn"
    />
  );
}
