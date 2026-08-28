import type { Cargo } from '@prisma/client';
import { prisma } from './prisma.js';

/** Cargos que mandan dentro de un área. El interino manda igual, pero con plazo. */
export const CARGOS_DE_MANDO: Cargo[] = ['JEFE_DE_AREA', 'JEFE_INTERINO'];

/** Quienes además pueden consultar el padrón de su área. */
export const CARGOS_DE_MESA: Cargo[] = ['JEFE_DE_AREA', 'JEFE_INTERINO', 'TESORERO'];

/** Un interino no puede quedarse indefinidamente. */
export const MESES_MAXIMOS_INTERINO = 12;

/**
 * Condición de jefatura en funciones.
 *
 * `hasta: null` es el caso normal —el cargo sigue abierto—; una fecha futura
 * es un interino con plazo todavía corriendo. Una fecha pasada ya terminó,
 * aunque nadie haya venido a relevarlo: el plazo se vence solo. Todas las
 * comprobaciones de permiso pasan por aquí para que no se olvide en ninguna.
 */
export const enFunciones = (ahora = new Date()) => ({
  OR: [{ hasta: null }, { hasta: { gte: ahora } }],
});

/** Áreas donde esta persona tiene alguno de esos cargos, en funciones. */
export async function areasConCargo(memberId: string | null, cargos: Cargo[]) {
  if (!memberId) return [];
  const js = await prisma.jefatura.findMany({
    where: { memberId, cargo: { in: cargos }, ...enFunciones() },
    select: { areaId: true },
  });
  return [...new Set(js.map((x) => x.areaId))];
}

/**
 * ¿Tiene aprobado el **curso base** de esa área?
 *
 * Es lo mismo que pertenecer a ella: solo el curso base da la membresía, y un
 * taller no basta. Por eso el requisito para ser jefe titular se mide aquí.
 */
export async function tieneCursoDelArea(memberId: string, areaId: string) {
  const claim = await prisma.courseClaim.findFirst({
    where: { memberId, status: 'APROBADA', course: { areaId, kind: 'AREA' } },
    select: { id: true },
  });
  return Boolean(claim);
}

/** Fecha límite por omisión de un interino: un año a partir de hoy. */
export function limiteInterino(desde = new Date()) {
  const d = new Date(desde);
  d.setMonth(d.getMonth() + MESES_MAXIMOS_INTERINO);
  return d;
}

/**
 * Cierra los cargos que esta persona tenga abiertos en un área.
 *
 * Relevar **no borra**: pone fecha de término y deja quién y por qué. Es lo
 * que convierte la tabla en un historial en lugar de una foto del presente.
 */
export async function cerrarJefaturas(
  tx: { jefatura: { updateMany: (a: never) => Promise<{ count: number }> } },
  {
    memberId, areaId, cargos, relevadoPor, motivo, cuando = new Date(),
  }: {
    memberId: string;
    areaId: string;
    cargos?: Cargo[];
    relevadoPor?: string | null;
    motivo?: string | null;
    cuando?: Date;
  },
) {
  return tx.jefatura.updateMany({
    where: {
      memberId,
      areaId,
      ...(cargos ? { cargo: { in: cargos } } : {}),
      ...enFunciones(cuando),
    },
    data: { hasta: cuando, relevadoPor: relevadoPor ?? null, motivoRelevo: motivo ?? null },
  } as never);
}
