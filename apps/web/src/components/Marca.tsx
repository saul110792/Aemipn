import { useState } from 'react';

/**
 * Escudo institucional. Usa el archivo del IPN colocado en
 * apps/web/public/logo-ipn.png. Si aún no está, cae en un escudo propio
 * dibujado en SVG para que la barra nunca se vea rota.
 */
export function Emblema({ tamano = 36 }: { tamano?: number }) {
  const [falloImagen, setFalloImagen] = useState(false);

  if (!falloImagen) {
    return (
      <span className="emblema-placa" style={{ width: tamano, height: tamano }}>
        <img
          src="/logo-ipn.png"
          alt="Instituto Politécnico Nacional"
          className="emblema"
          onError={() => setFalloImagen(true)}
        />
      </span>
    );
  }

  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 48 48"
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
