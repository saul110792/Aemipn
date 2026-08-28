/**
 * Iconografia propia en SVG, dibujada para este proyecto.
 * Trazo de 1.6, caja de 24, sin relleno: heredan el color del texto y escalan
 * sin perder nitidez. Se eligio dibujarlos en lugar de descargar un paquete
 * externo para no depender de archivos ni de licencias de terceros.
 */

export type NombreIcono =
  | 'alta-montana'
  | 'media-montana'
  | 'ciclismo-de-montana'
  | 'escalada-en-roca'
  | 'boulder'
  | 'canonismo'
  | 'espeleologia'
  | 'fotografia-de-montana'
  | 'resumen'
  | 'miembros'
  | 'solicitudes'
  | 'areas'
  | 'cursos'
  | 'calendario'
  | 'brujula'
  | 'pago'
  | 'lugar'
  | 'video'
  | 'imagen'
  | 'texto';

const TRAZOS: Record<NombreIcono, JSX.Element> = {
  // --- Areas ---
  // Cumbre nevada con arista: la alta montana.
  'alta-montana': (
    <>
      <path d="M2 20h20L14.5 5 11 12l-2-3z" />
      <path d="M12.2 8.6l2.3 4 2.4-1.4 1.6 2.8" />
    </>
  ),
  // Dos cerros redondeados con sol: lomerio, no cumbre.
  'media-montana': (
    <>
      <circle cx="17.5" cy="6" r="2.3" />
      <path d="M2 19.5h20" />
      <path d="M2.6 19.5c2.3-6 4.8-9 7.4-9s5.1 3 7.4 9" />
      <path d="M13 19.5c1.4-3.1 2.9-4.7 4.4-4.7s2.9 1.6 4.3 4.7" />
    </>
  ),
  // Bicicleta de montana.
  'ciclismo-de-montana': (
    <>
      <circle cx="5.5" cy="17" r="3.5" />
      <circle cx="18.5" cy="17" r="3.5" />
      <path d="M5.5 17l4-8h5l-3.5 8h7.5" />
      <path d="M12 9h4" />
      <path d="M14.5 9L17 17" />
    </>
  ),
  // Pared con presas y escalador en progresion.
  'escalada-en-roca': (
    <>
      <path d="M4 2v20" />
      <circle cx="4.5" cy="7" r="0.9" />
      <circle cx="4.5" cy="14" r="0.9" />
      <circle cx="14" cy="5.5" r="2" />
      <path d="M14 7.5v5.5" />
      <path d="M14 9L7.5 7" />
      <path d="M14 10.5l4 2.5" />
      <path d="M14 13l-4.5 4.5" />
      <path d="M14 13l2 5.5" />
    </>
  ),
  // Bloque de roca con presas.
  boulder: (
    <>
      <path d="M3 20l4-13 6-3 8 6-2 10z" />
      <circle cx="9" cy="12" r="1" />
      <circle cx="14" cy="10" r="1" />
      <circle cx="15" cy="16" r="1" />
      <path d="M7 7l6 4 6-1" />
    </>
  ),
  // Paredes que se cierran, cuerda de rapel y agua al fondo.
  canonismo: (
    <>
      <path d="M4 2.5L7.5 21" />
      <path d="M20 2.5L16.5 21" />
      <path d="M12 2.5v7.5" />
      <circle cx="12" cy="11.6" r="1.6" />
      <path d="M6.6 16.4c1.8-1.1 3.2-.2 4.7 0s3.4-.9 5.2-.4" />
      <path d="M7.2 19.6c1.8-1.1 3.2-.2 4.7 0s3.4-.9 5.2-.4" />
    </>
  ),
  // Corte de caverna: superficie, cavidad, estalactitas y espeleologo.
  espeleologia: (
    <>
      <path d="M2 6.5h20" />
      <path d="M4.5 6.5c0 6.6 3.3 10.5 7.5 10.5s7.5-3.9 7.5-10.5" />
      <path d="M8 7.5l1 3.2" />
      <path d="M12 7.5l1.3 4" />
      <path d="M16 7.5l-1 3.2" />
      <circle cx="12" cy="14.8" r="1.5" />
      <path d="M9 21h6" />
    </>
  ),
  // Camara con una cumbre en el visor.
  'fotografia-de-montana': (
    <>
      <rect x="2" y="6" width="20" height="14" rx="2.5" />
      <path d="M8 6l1.5-2h5L16 6" />
      <path d="M6.5 17l3.5-5 2.2 3 1.8-2.4 3.5 4.4z" />
      <circle cx="17.5" cy="9.5" r="1" />
    </>
  ),

  // --- Interfaz del panel ---
  resumen: (
    <>
      <rect x="3" y="3" width="7.5" height="8" rx="1.5" />
      <rect x="13.5" y="3" width="7.5" height="5" rx="1.5" />
      <rect x="3" y="14" width="7.5" height="7" rx="1.5" />
      <rect x="13.5" y="11" width="7.5" height="10" rx="1.5" />
    </>
  ),
  miembros: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
      <path d="M16.5 5.2a3.5 3.5 0 010 5.6" />
      <path d="M18 14.4c2.1.7 3.5 2.5 3.5 5.6" />
    </>
  ),
  solicitudes: (
    <>
      <path d="M5 3h9l5 5v13a1 1 0 01-1 1H5a1 1 0 01-1-1V4a1 1 0 011-1z" />
      <path d="M14 3v5h5" />
      <path d="M8.5 14.5l2 2 4-4.5" />
    </>
  ),
  areas: (
    <>
      <path d="M9 3L3 5.5v15L9 18l6 3 6-2.5v-15L15 6z" />
      <path d="M9 3v15" />
      <path d="M15 6v15" />
    </>
  ),
  cursos: (
    <>
      <path d="M12 6.5L3 4v14l9 2.5L21 18V4z" />
      <path d="M12 6.5v14" />
    </>
  ),
  calendario: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 3v4M16 3v4" />
    </>
  ),
  brujula: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M15.5 8.5l-2 5-5 2 2-5z" />
    </>
  ),
  pago: (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="2" />
      <path d="M2.5 10h19" />
      <path d="M6 15h4" />
    </>
  ),
  lugar: (
    <>
      <path d="M12 21.5s7-6 7-11.5a7 7 0 10-14 0c0 5.5 7 11.5 7 11.5z" />
      <circle cx="12" cy="10" r="2.6" />
    </>
  ),
  video: (
    <>
      <rect x="2.5" y="6" width="13" height="12" rx="2.5" />
      <path d="M15.5 10.5l6-3.2v9.4l-6-3.2z" />
    </>
  ),
  imagen: (
    <>
      <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
      <circle cx="8.5" cy="9.5" r="1.6" />
      <path d="M4 17l4.5-5 3.2 3.6 2.8-2.4L20 17.5" />
    </>
  ),
  texto: (
    <>
      <path d="M4 6h16" />
      <path d="M4 11h16" />
      <path d="M4 16h10" />
      <path d="M4 21h7" />
    </>
  ),
};

interface Props {
  nombre: NombreIcono;
  className?: string;
  /** El icono es decorativo por omision; dale titulo si carga significado propio. */
  titulo?: string;
}

export function Icono({ nombre, className = 'icono', titulo }: Props) {
  const trazos = TRAZOS[nombre];
  if (!trazos) return null;

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={titulo ? 'img' : undefined}
      aria-label={titulo}
      aria-hidden={titulo ? undefined : true}
    >
      {titulo && <title>{titulo}</title>}
      {trazos}
    </svg>
  );
}

/** true si el slug tiene icono propio; sirve para no romper con areas nuevas. */
export const hayIcono = (slug: string): slug is NombreIcono => slug in TRAZOS;
