/** Utilidades de fechas y acomodo de barras para la vista de calendario. */

export interface EntradaCalendario {
  id: string;
  tipo: 'SESION' | 'EVENTO' | 'EDICION';
  titulo: string;
  detalle: string | null;
  inicio: string;
  fin: string;
  lugar: string | null;
  area: { id: string; nombre: string; slug: string; color: string | null } | null;
  ruta: string;
  ajeno: boolean;
}

export interface RespuestaCalendario {
  entradas: EntradaCalendario[];
  vePlaneacion: boolean;
  misAreas: string[];
}

/** Medianoche local del día de esa fecha. Comparar días, no instantes. */
export const aDia = (v: Date | string) => {
  const d = new Date(v);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const sumarDias = (d: Date, n: number) => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};

export const mismoDia = (a: Date, b: Date) => aDia(a).getTime() === aDia(b).getTime();

/** Diferencia en días completos entre dos fechas. */
export const diasEntre = (a: Date, b: Date) =>
  Math.round((aDia(b).getTime() - aDia(a).getTime()) / 86_400_000);

/**
 * Las seis semanas que cubren un mes, empezando en lunes.
 * Se devuelven siempre seis para que la rejilla no cambie de alto al navegar.
 */
export function semanasDelMes(anio: number, mes: number): Date[][] {
  const primero = new Date(anio, mes, 1);
  // getDay() da 0 para domingo; aquí la semana abre en lunes.
  const desplazamiento = (primero.getDay() + 6) % 7;
  const inicio = sumarDias(primero, -desplazamiento);

  return Array.from({ length: 6 }, (_, semana) =>
    Array.from({ length: 7 }, (_, dia) => sumarDias(inicio, semana * 7 + dia)),
  );
}

export interface Barra {
  entrada: EntradaCalendario;
  /** Columna donde empieza dentro de la semana, 0 a 6. */
  desde: number;
  /** Cuántas columnas ocupa. */
  ancho: number;
  /** Renglón dentro de la celda, para que dos barras no se pisen. */
  carril: number;
  /** La actividad ya venía de la semana anterior. */
  continua: boolean;
  /** Y sigue en la siguiente. */
  sigue: boolean;
}

/**
 * Acomoda las entradas de una semana en carriles.
 *
 * Se ordena por fecha de inicio y, a igualdad, la más larga primero: así las
 * actividades que abarcan varios días quedan arriba y las de un día se
 * reparten debajo, que es como se leen mejor.
 */
export function acomodarSemana(semana: Date[], entradas: EntradaCalendario[]): Barra[] {
  const inicioSemana = semana[0];
  const finSemana = semana[6];

  const enLaSemana = entradas
    .map((e) => ({ e, ini: aDia(e.inicio), fin: aDia(e.fin) }))
    .filter(({ ini, fin }) => fin >= inicioSemana && ini <= finSemana)
    .sort((a, b) => {
      const porInicio = a.ini.getTime() - b.ini.getTime();
      if (porInicio !== 0) return porInicio;
      const duracionA = diasEntre(a.ini, a.fin);
      const duracionB = diasEntre(b.ini, b.fin);
      return duracionB - duracionA;
    });

  // Por carril, hasta qué columna está ocupado.
  const ocupadoHasta: number[] = [];
  const barras: Barra[] = [];

  for (const { e, ini, fin } of enLaSemana) {
    const desde = Math.max(0, diasEntre(inicioSemana, ini));
    const hasta = Math.min(6, diasEntre(inicioSemana, fin));
    const ancho = Math.max(1, hasta - desde + 1);

    let carril = ocupadoHasta.findIndex((ocupado) => ocupado < desde);
    if (carril === -1) carril = ocupadoHasta.length;
    ocupadoHasta[carril] = desde + ancho - 1;

    barras.push({
      entrada: e,
      desde,
      ancho,
      carril,
      continua: ini < inicioSemana,
      sigue: fin > finSemana,
    });
  }

  return barras;
}

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

export const nombreMes = (mes: number) => MESES[mes];
export const DIAS_CORTOS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
