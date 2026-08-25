import type { AreaRole } from '@prisma/client';
import { prisma } from './prisma.js';

/** Roles que mandan dentro de un área. El interino manda igual, pero con plazo. */
export const ROLES_DE_MANDO: AreaRole[] = ['JEFE_DE_AREA', 'JEFE_INTERINO'];

/** Quienes además pueden consultar el padrón de su área. */
export const ROLES_DE_MESA: AreaRole[] = ['JEFE_DE_AREA', 'JEFE_INTERINO', 'TESORERO'];

/** Un interino no puede quedarse indefinidamente. */
export const MESES_MAXIMOS_INTERINO = 12;

/**
 * Condición de nombramiento vigente.
 *
 * No basta con `activo`: un interino con fecha de término vencida sigue
 * marcado activo pero ya no debe mandar. Todas las comprobaciones de permiso
 * pasan por aquí para que no se olvide en ninguna.
 */
export const vigente = (ahora = new Date()) => ({
  activo: true,
  OR: [{ hasta: null }, { hasta: { gte: ahora } }],
});

/** Áreas donde esta persona tiene alguno de esos roles, con nombramiento vigente. */
export async function areasConRol(memberId: string | null, roles: AreaRole[]) {
  if (!memberId) return [];
  const m = await prisma.areaMembership.findMany({
    where: { memberId, role: { in: roles }, ...vigente() },
    select: { areaId: true },
  });
  return m.map((x) => x.areaId);
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
