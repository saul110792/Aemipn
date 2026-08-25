import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { conflict, forbidden, notFound } from '../lib/errors.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { ROLES_DE_MANDO, areasConRol } from '../lib/jefaturas.js';

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

  return areasConRol(user.memberId, ROLES_DE_MANDO);
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

      // Solo el curso base de un area integra a ella. Un taller es formacion
      // complementaria: queda en el historial, pero no abre el area.
      const integraAlArea = claim.course.kind === 'AREA' && claim.course.areaId !== null;

      if (integraAlArea) {
        await tx.areaMembership.upsert({
          where: { memberId_areaId: { memberId: claim.memberId, areaId: claim.course.areaId! } },
          create: { memberId: claim.memberId, areaId: claim.course.areaId!, role: 'MIEMBRO' },
          update: { activo: true, hasta: null },
        });
      }

      // Con un curso aprobado deja de ser solo aspirante.
      await tx.member.update({
        where: { id: claim.memberId },
        data: { status: 'ACTIVO' },
      });

      // Sube de CIM a miembro solo al acreditar el curso base de un area.
      if (integraAlArea) {
        await tx.user.updateMany({
          where: { memberId: claim.memberId, role: 'CIM' },
          data: { role: 'MIEMBRO' },
        });
      }

      return { ...actualizada, integraAlArea };
    });

    res.json(resultado);
  }),
);

const correccionSchema = z.object({
  anio: z.coerce
    .number()
    .int()
    .min(1980, 'El ano no puede ser anterior a 1980')
    .max(new Date().getFullYear(), 'El ano no puede ser futuro'),
  letra: z.enum(['A', 'B', 'C', 'D', 'E'], {
    errorMap: () => ({ message: 'La generacion va de la A a la E' }),
  }),
  notas: z.string().max(500).optional().nullable(),
});

/**
 * PATCH /api/claims/:id
 *
 * El area corrige la generacion con su registro en la mano, y puede hacerlo
 * aunque la declaracion ya este resuelta: si aprobo 2023 y su lista dice 2022,
 * lo que vale es su lista. No se toca el curso ni el estado, solo el dato:
 * cambiar el curso movería la revision a otra area y eso es una declaracion
 * distinta, no una correccion.
 */
claimsRouter.patch(
  '/:id',
  validate(correccionSchema),
  asyncHandler(async (req, res) => {
    const claim = await exigirPermiso(req.user!, req.params.id);
    const d = req.body as z.infer<typeof correccionSchema>;

    const choque = await prisma.courseClaim.findFirst({
      where: {
        memberId: claim.memberId,
        courseId: claim.courseId,
        anio: d.anio,
        letra: d.letra,
        NOT: { id: claim.id },
      },
    });
    if (choque) {
      throw conflict('Esa persona ya tiene declarada esa generacion de este curso.');
    }

    res.json(
      await prisma.courseClaim.update({
        where: { id: claim.id },
        data: {
          anio: d.anio,
          letra: d.letra,
          notas: d.notas ?? claim.notas,
          editadaPor: req.user!.email,
          editadaEn: new Date(),
        },
        include: incluye,
      }),
    );
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
