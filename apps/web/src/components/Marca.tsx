/**
 * Emblema de la AEMIPN: escudo con tres cumbres y la sigla.
 * Es un diseno propio, no el escudo oficial del IPN — ese es un activo
 * institucional con reglas de uso. Cuando consigas el archivo oficial por el
 * canal que corresponda, colocalo en apps/web/public/ y sustituye el <svg>
 * de <Emblema> por un <img src="/logo-ipn.svg" alt="Instituto Politecnico Nacional" />.
 */

export function Emblema({ tamano = 34 }: { tamano?: number }) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 48 48"
      role="img"
      aria-label="Emblema de la AEMIPN"
      fill="none"
    >
      {/* Escudo */}
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
      {/* Tres cumbres, la central nevada */}
      <path
        d="M11 31l6.5-11 4 6.5 4.5-9.5L34 31z"
        fill="currentColor"
      />
      <path
        d="M24.2 18.6l2.1 4.4-2.3 1-2 -1z"
        fill="#ffffff"
        opacity="0.85"
      />
      {/* Linea de horizonte */}
      <path d="M10 34.5h28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Bloque de marca completo para la barra superior. */
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
