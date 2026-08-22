import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth, requireRole('ADMIN', 'STAFF'));

/** GET /api/dashboard — cifras de un vistazo para la mesa directiva. */
dashboardRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const [
      porStatus,
      porArea,
      solicitudesNuevas,
      edicionesActivas,
      pagosPendientes,
      proximasActividades,
    ] = await Promise.all([
      prisma.member.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.area.findMany({
        where: { activa: true },
        orderBy: { orden: 'asc' },
        select: {
          id: true, nombre: true, slug: true, color: true,
          _count: { select: { miembros: { where: { activo: true } } } },
        },
      }),
      prisma.membershipApplication.count({ where: { status: { in: ['NUEVA', 'EN_REVISION'] } } }),
      prisma.courseEdition.findMany({
        where: { estado: { in: ['INSCRIPCIONES_ABIERTAS', 'EN_CURSO'] } },
        orderBy: { fechaInicio: 'asc' },
        include: {
          course: { select: { nombre: true, kind: true } },
          _count: { select: { inscripciones: true } },
        },
      }),
      prisma.enrollment.count({ where: { paymentStatus: { in: ['PENDIENTE', 'PARCIAL'] } } }),
      prisma.editionActivity.findMany({
        where: { fechaInicio: { gte: new Date() } },
        orderBy: { fechaInicio: 'asc' },
        take: 8,
        include: {
          area: { select: { nombre: true, color: true } },
          edition: { select: { clave: true } },
          responsable: { select: { nombre: true, apellidoPaterno: true } },
        },
      }),
    ]);

    res.json({
      miembros: {
        total: porStatus.reduce((acc, s) => acc + s._count._all, 0),
        porStatus: Object.fromEntries(porStatus.map((s) => [s.status, s._count._all])),
      },
      areas: porArea.map((a) => ({ ...a, miembros: a._count.miembros })),
      solicitudesNuevas,
      edicionesActivas,
      pagosPendientes,
      proximasActividades,
    });
  }),
);
