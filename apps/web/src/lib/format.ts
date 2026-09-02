import i18n from './i18n';

const fechaLarga = new Intl.DateTimeFormat('es-MX', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const fechaCorta = new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
const conHora = new Intl.DateTimeFormat('es-MX', {
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
});

const soloHora = new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit' });

export const fmtHora = (v: string | Date) => soloHora.format(new Date(v));
export const fmtFecha = (v: string | Date) => fechaLarga.format(new Date(v));
export const fmtFechaCorta = (v: string | Date) => fechaCorta.format(new Date(v));
export const fmtFechaHora = (v: string | Date) => conHora.format(new Date(v));

/** "7 – 8 de marzo de 2026" cuando cae en el mismo mes. */
export function fmtRango(inicio: string | Date, fin: string | Date) {
  const a = new Date(inicio);
  const b = new Date(fin);
  if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) {
    const mes = new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' }).format(a);
    return a.getDate() === b.getDate()
      ? `${a.getDate()} de ${mes}`
      : `${a.getDate()} – ${b.getDate()} de ${mes}`;
  }
  return `${fmtFecha(a)} – ${fmtFecha(b)}`;
}

export const nombreCompleto = (m: {
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno?: string | null;
}) => [m.nombre, m.apellidoPaterno, m.apellidoMaterno].filter(Boolean).join(' ');

/**
 * Etiquetas legibles para los enums que vienen de la API, vía i18next.
 *
 * Es una función plana (no un hook) para poder llamarla desde cualquier
 * lado sin reescribir cada punto de uso; el cambio de idioma se refleja
 * igual porque ConIdioma (main.tsx) reconstruye todo el árbol al cambiarlo.
 */
export const etiqueta = (v: string | null | undefined) =>
  v ? i18n.t(`enum.${v}`, { defaultValue: v }) : '—';

/**
 * Tipos de curso, con namespace aparte a propósito: 'AREA' es también un
 * valor de EventVisibility ("Privado del área") y compartir un solo mapa
 * pisaría uno con el otro.
 */
export const etiquetaTipoCurso = (v: string | null | undefined) =>
  v ? i18n.t(`enumCurso.${v}`, { defaultValue: v }) : '—';
