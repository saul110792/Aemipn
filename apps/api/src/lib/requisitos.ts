import { prisma } from './prisma.js';

/**
 * Requisitos previos de un curso.
 *
 * Alta Montaña es el caso que motivó esto: no se entra a su curso base sin
 * haber hecho antes el CIM y el curso básico. La regla vive en datos y no en
 * código porque el catálogo de cursos lo maneja la asociación, no el programa;
 * si mañana Espeleología pide lo mismo, se configura y ya.
 */
export interface RevisionDeRequisitos {
  cumple: boolean;
  faltantes: { id: string; nombre: string; clave: string | null }[];
  cubiertos: { id: string; nombre: string; clave: string | null }[];
}

/**
 * ¿Esta persona puede tomar ese curso?
 *
 * Un requisito se da por cumplido de dos maneras, y ambas cuentan igual:
 * la declaración histórica aprobada por el jefe de área (para quien lo tomó
 * antes de que existiera el sistema) o una inscripción acreditada aquí dentro.
 */
export async function revisarRequisitos(
  memberId: string,
  courseId: string,
): Promise<RevisionDeRequisitos> {
  const curso = await prisma.course.findUnique({
    where: { id: courseId },
    select: { requiere: { select: { id: true, nombre: true, codigo: true } } },
  });

  const requeridos = curso?.requiere ?? [];
  if (requeridos.length === 0) return { cumple: true, faltantes: [], cubiertos: [] };

  const ids = requeridos.map((c) => c.id);

  const [declarados, acreditados] = await Promise.all([
    prisma.courseClaim.findMany({
      where: { memberId, status: 'APROBADA', courseId: { in: ids } },
      select: { courseId: true },
    }),
    prisma.enrollment.findMany({
      where: { memberId, status: 'ACREDITADO', edition: { courseId: { in: ids } } },
      select: { edition: { select: { courseId: true } } },
    }),
  ]);

  const cubiertos = new Set([
    ...declarados.map((d) => d.courseId),
    ...acreditados.map((a) => a.edition.courseId),
  ]);

  const conClave = (c: (typeof requeridos)[number]) => ({
    id: c.id,
    nombre: c.nombre,
    clave: c.codigo,
  });

  return {
    cumple: requeridos.every((c) => cubiertos.has(c.id)),
    faltantes: requeridos.filter((c) => !cubiertos.has(c.id)).map(conClave),
    cubiertos: requeridos.filter((c) => cubiertos.has(c.id)).map(conClave),
  };
}

/** Frase para el mensaje de error, ya conjugada según cuántos falten. */
export function faltantesEnPalabras(faltantes: RevisionDeRequisitos['faltantes']) {
  const nombres = faltantes.map((c) => c.nombre);
  if (nombres.length === 1) return nombres[0];
  return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
}
