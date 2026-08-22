import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { badRequest, conflict, notFound } from '../lib/errors.js';
import { validate } from '../middleware/validate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const enrollmentsRouter = Router();
enrollmentsRouter.use(requireAuth);

const createSchema = z.object({
  memberId: z.string().min(1),
  editionId: z.string().min(1),
  status: z
    .enum(['PREINSCRITO', 'INSCRITO', 'ACREDITADO', 'NO_ACREDITADO', 'BAJA'])
    .default('PREINSCRITO'),
  paymentStatus: z.enum(['PENDIENTE', 'PARCIAL', 'PAGADO', 'EXENTO']).default('PENDIENTE'),
  montoPagado: z.coerce.number().nonnegative().optional().nullable(),
  referenciaPago: z.string().optional().nullable(),
  notas: z.string().optional().nullable(),
});

const updateSchema = createSchema
  .omit({ memberId: true, editionId: true })
  .partial()
  .extend({
    calificacion: z.string().optional().nullable(),
    fechaAcreditacion: z.coerce.date().optional().nullable(),
  });

enrollmentsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { editionId, memberId, status, paymentStatus } = req.query as Record<string, never>;
    const inscripciones = await prisma.enrollment.findMany({
      where: {
        ...(editionId ? { editionId } : {}),
        ...(memberId ? { memberId } : {}),
        ...(status ? { status } : {}),
        ...(paymentStatus ? { paymentStatus } : {}),
      },
      include: {
        member: { select: { id: true, nombre: true, apellidoPaterno: true, email: true, telefono: true } },
        edition: { include: { course: { select: { nombre: true, kind: true } } } },
      },
      orderBy: { fechaInscripcion: 'desc' },
    });
    res.json(inscripciones);
  }),
);

/** POST /api/enrollments — inscribir a un miembro, respetando el cupo. */
enrollmentsRouter.post(
  '/',
  requireRole('ADMIN', 'STAFF'),
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const data = req.body as z.infer<typeof createSchema>;

    const edition = await prisma.courseEdition.findUnique({
      where: { id: data.editionId },
      include: { _count: { select: { inscripciones: true } } },
    });
    if (!edition) throw notFound('Edicion no encontrada');
    if (edition.estado === 'CANCELADA') throw badRequest('La edicion esta cancelada');
    if (edition.cupo !== null && edition._count.inscripciones >= edition.cupo) {
      throw conflict('La edicion ya alcanzo su cupo maximo');
    }

    const existente = await prisma.enrollment.findUnique({
      where: { memberId_editionId: { memberId: data.memberId, editionId: data.editionId } },
    });
    if (existente) throw conflict('El miembro ya esta inscrito en esta edicion');

    const enrollment = await prisma.enrollment.create({
      data,
      include: { member: true, edition: { include: { course: true } } },
    });

    res.status(201).json(enrollment);
  }),
);

enrollmentsRouter.patch(
  '/:id',
  requireRole('ADMIN', 'STAFF'),
  validate(updateSchema),
  asyncHandler(async (req, res) => {
    const data = req.body as z.infer<typeof updateSchema>;

    // Acreditar sella la fecha automaticamente si no viene una explicita.
    if (data.status === 'ACREDITADO' && !data.fechaAcreditacion) {
      data.fechaAcreditacion = new Date();
    }

    res.json(await prisma.enrollment.update({ where: { id: req.params.id }, data }));
  }),
);

enrollmentsRouter.delete(
  '/:id',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    await prisma.enrollment.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  }),
);
