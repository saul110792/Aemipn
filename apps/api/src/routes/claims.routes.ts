import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { forbidden, notFound } from '../lib/errors.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';

export const claimsRouter = Router();
claimsRouter.use(requireAuth);

const incluye = {
  member: {
    select: {
      id: true, nombre: true, apellidoPaterno: true, apellidoMaterno: true,
      email: true, telefono: true, boleta: true, escuela: true, status: true,
    },
  },
  course: {
    include: { area: { select: { id: true, nombre: true, slug: true, color: true } } },
  },
} as const;

/**
 * Áreas cuyas declaraciones puede resolver esta persona.
 * `null` significa "todas" (mesa directiva). Un jefe solo revisa lo suyo.
 */
async function areasQueRevisa(user: { role: string; memberId: string | null }) {
  if (user.role === 'ADMIN' || user.role === 'STAFF') return null;
  if (!user.memberId) return [];

  const m = await prisma.areaMembership.findMany({
    where: { memberId: user.memberId, activo: true, role: 'JEFE_DE_AREA' },
    select: { areaId: true },
  });
  return m.map((x) => x.areaId);
}

/** El CIM no pertenece a un área; lo resuelve quien lo coordina. */
const revisaElCim = (role: string) => role === 'ADMIN' || role === 'STAFF' || role === 'JEFE_CIM';

/**
 * GET /api/claims?status=PENDIENTE
 * Devuelve solo las declaraciones que quien pregunta puede resolver.
 */
claimsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { status } = req.query as { status?: never };
    const areas = await areasQueRevisa(req.user!);

    const where =
      areas === null
        ? {}
        : {
            OR: [
              { course: { areaId: { in: areas } } },
              // Cursos transversales (el CIM) solo si coordina el CIM.
              ...(revisaElCim(req.user!.role) ? [{ course: { areaId: null } }] : []),
            ],
          };

    // Sin áreas ni coordinación del CIM no hay nada que revisar.
    if (areas !== null && areas.length === 0 && !revisaElCim(req.user!.role)) {
      return res.json([]);
    }

    res.json(
      await prisma.courseClaim.findMany({
        where: { ...where, ...(status ? { status } : {}) },
        include: incluye,
        orderBy: { createdAt: 'asc' },
      }),
    );
  }),
);

/** Comprueba que esta persona pueda resolver esta declaración en concreto. */
async function exigirPermiso(user: { role: string; memberId: string | null }, claimId: string) {
  const claim = await prisma.courseClaim.findUnique({
    where: { id: claimId },
    include: { course: true },
  });
  if (!claim) throw notFound('Declaracion no encontrada');

  const areas = await areasQueRevisa(user);
  if (areas === null) return claim;

  const esDelCim = claim.course.areaId === null;
  if (esDelCim && revisaElCim(user.role)) return claim;
  if (!esDelCim && claim.course.areaId && areas.includes(claim.course.areaId)) return claim;

  throw forbidden('Solo puedes revisar declaraciones de tu area');
}

/**
 * POST /api/claims/:id/aprobar
 *
 * Aprobar da acceso: el miembro entra al área del curso y desde ahí ve lo suyo.
 * Si el curso es transversal (el CIM) no hay área a la que sumarlo, pero deja
 * de ser un simple registrado.
 */
claimsRouter.post(
  '/:id/aprobar',
  asyncHandler(async (req, res) => {
    const claim = await exigirPermiso(req.user!, req.params.id);
    if (claim.status === 'APROBADA') return res.json(claim);

    const resultado = await prisma.$transaction(async (tx) => {
      const actualizada = await tx.courseClaim.update({
        where: { id: claim.id },
        data: {
          status: 'APROBADA',
          revisadaPor: req.user!.email,
          revisadaEn: new Date(),
          motivoRechazo: null,
        },
        include: incluye,
      });

      if (claim.course.areaId) {
        await tx.areaMembership.upsert({
          where: { memberId_areaId: { memberId: claim.memberId, areaId: claim.course.areaId } },
          create: { memberId: claim.memberId, areaId: claim.course.areaId, role: 'MIEMBRO' },
          update: { activo: true, hasta: null },
        });
      }

      // Con un curso aprobado deja de ser solo aspirante.
      await tx.member.update({
        where: { id: claim.memberId },
        data: { status: 'ACTIVO' },
      });

      // Quien solo tenia el CIM pasa a miembro en cuanto acredita un area.
      if (claim.course.areaId) {
        await tx.user.updateMany({
          where: { memberId: claim.memberId, role: 'CIM' },
          data: { role: 'MIEMBRO' },
        });
      }

      return actualizada;
    });

    res.json(resultado);
  }),
);

const rechazoSchema = z.object({ motivo: z.string().min(1, 'Indica el motivo del rechazo') });

claimsRouter.post(
  '/:id/rechazar',
  validate(rechazoSchema),
  asyncHandler(async (req, res) => {
    const claim = await exigirPermiso(req.user!, req.params.id);

    res.json(
      await prisma.courseClaim.update({
        where: { id: claim.id },
        data: {
          status: 'RECHAZADA',
          motivoRechazo: req.body.motivo,
          revisadaPor: req.user!.email,
          revisadaEn: new Date(),
        },
        include: incluye,
      }),
    );
  }),
);
