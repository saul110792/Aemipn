import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { conflict, notFound } from '../lib/errors.js';
import { validate } from '../middleware/validate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const applicationsRouter = Router();
applicationsRouter.use(requireAuth, requireRole('ADMIN', 'STAFF'));

applicationsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { status } = req.query as { status?: never };
    res.json(
      await prisma.membershipApplication.findMany({
        where: status ? { status } : {},
        orderBy: { createdAt: 'desc' },
      }),
    );
  }),
);

applicationsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const app = await prisma.membershipApplication.findUnique({ where: { id: req.params.id } });
    if (!app) throw notFound('Solicitud no encontrada');
    res.json(app);
  }),
);

/**
 * POST /api/applications/:id/aceptar
 * Convierte la solicitud en un miembro ASPIRANTE y lo asigna a las areas que pidio.
 */
applicationsRouter.post(
  '/:id/aceptar',
  asyncHandler(async (req, res) => {
    const app = await prisma.membershipApplication.findUnique({ where: { id: req.params.id } });
    if (!app) throw notFound('Solicitud no encontrada');
    if (app.status === 'ACEPTADA') throw conflict('Esta solicitud ya fue aceptada');

    const yaExiste = await prisma.member.findUnique({ where: { email: app.email.toLowerCase() } });
    if (yaExiste) throw conflict(`Ya existe un miembro con el correo ${app.email}`);

    const areas = await prisma.area.findMany({ where: { slug: { in: app.areasInteres } } });

    const member = await prisma.$transaction(async (tx) => {
      const nuevo = await tx.member.create({
        data: {
          nombre: app.nombre,
          apellidoPaterno: app.apellidoPaterno,
          apellidoMaterno: app.apellidoMaterno,
          email: app.email.toLowerCase(),
          telefono: app.telefono,
          escuela: app.escuela,
          boleta: app.boleta,
          status: 'ASPIRANTE',
          notas: app.experiencia,
          areas: { create: areas.map((a) => ({ areaId: a.id, role: 'MIEMBRO' as const })) },
        },
        include: { areas: { include: { area: true } } },
      });

      await tx.membershipApplication.update({
        where: { id: app.id },
        data: {
          status: 'ACEPTADA',
          revisadaPor: req.user!.email,
          revisadaEn: new Date(),
          memberId: nuevo.id,
        },
      });

      return nuevo;
    });

    res.status(201).json(member);
  }),
);

const rechazarSchema = z.object({ motivo: z.string().min(1, 'Indica el motivo del rechazo') });

applicationsRouter.post(
  '/:id/rechazar',
  validate(rechazarSchema),
  asyncHandler(async (req, res) => {
    res.json(
      await prisma.membershipApplication.update({
        where: { id: req.params.id },
        data: {
          status: 'RECHAZADA',
          motivoRechazo: req.body.motivo,
          revisadaPor: req.user!.email,
          revisadaEn: new Date(),
        },
      }),
    );
  }),
);
