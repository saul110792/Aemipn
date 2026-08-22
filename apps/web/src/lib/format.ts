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
const moneda = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

const soloHora = new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit' });

export const fmtHora = (v: string | Date) => soloHora.format(new Date(v));
export const fmtFecha = (v: string | Date) => fechaLarga.format(new Date(v));
export const fmtFechaCorta = (v: string | Date) => fechaCorta.format(new Date(v));
export const fmtFechaHora = (v: string | Date) => conHora.format(new Date(v));
export const fmtMoneda = (v: string | number | null | undefined) =>
  v === null || v === undefined ? '—' : moneda.format(Number(v));

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

/** Etiquetas legibles para los enums que vienen de la API. */
export const ETIQUETAS: Record<string, string> = {
  ADMIN: 'Administrador',
  STAFF: 'Apoyo',
  MIEMBRO: 'Miembro',
  JEFE_DE_AREA: 'Jefe de área',
  TESORERO: 'Tesorero',
  ASPIRANTE: 'Aspirante',
  ACTIVO: 'Activo',
  INACTIVO: 'Inactivo',
  BAJA: 'Baja',
  NUEVA: 'Nueva',
  EN_REVISION: 'En revisión',
  ACEPTADA: 'Aceptada',
  RECHAZADA: 'Rechazada',
  BORRADOR: 'Borrador',
  INSCRIPCIONES_ABIERTAS: 'Inscripciones abiertas',
  EN_CURSO: 'En curso',
  CONCLUIDA: 'Concluida',
  CANCELADA: 'Cancelada',
  PREINSCRITO: 'Preinscrito',
  INSCRITO: 'Inscrito',
  ACREDITADO: 'Acreditado',
  NO_ACREDITADO: 'No acreditado',
  PENDIENTE: 'Pendiente',
  PARCIAL: 'Pago parcial',
  PAGADO: 'Pagado',
  EXENTO: 'Exento',
  CIM: 'CIM',
  CURSO: 'Curso',
  TALLER: 'Taller',
  SALIDA: 'Salida',
  REUNION: 'Reunión',
  CONVOCATORIA: 'Convocatoria',
  OTRO: 'Otro',
  PRESENCIAL: 'Presencial',
  EN_LINEA: 'En línea',
  HIBRIDA: 'Híbrida',
  PUBLICO: 'Público',
  MIEMBROS: 'Solo miembros',
  AREA: 'Privado del área',
  TECNICO: 'Técnico',
  CERTIFICACION: 'Certificación',
};

export const etiqueta = (v: string | null | undefined) => (v ? (ETIQUETAS[v] ?? v) : '—');
