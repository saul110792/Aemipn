import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { notFound } from '../lib/errors.js';
import { validate } from '../middleware/validate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const coursesRouter = Router();
coursesRouter.use(requireAuth);

const courseSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  nombre: z.string().min(1),
  kind: z.enum(['CIM', 'TECNICO', 'CERTIFICACION', 'TALLER']).default('TECNICO'),
  descripcion: z.string().optional().nullable(),
  contenido: z.string().optional().nullable(),
  requisitos: z.string().optional().nullable(),
  duracionHoras: z.coerce.number().int().positive().optional().nullable(),
  areaId: z.string().optional().nullable(),
  activo: z.boolean().default(true),
});

coursesRouter.get(
  '/',
  validate(z.object({ kind: z.enum(['CIM', 'TECNICO', 'CERTIFICACION', 'TALLER']).optional(), areaId: z.string().optional() }), 'query'),
  asyncHandler(async (req, res) => {
    const { kind, areaId } = req.query as { kind?: never; areaId?: string };
    const courses = await prisma.course.findMany({
      where: { ...(kind ? { kind } : {}), ...(areaId ? { areaId } : {}) },
      include: {
        area: { select: { id: true, nombre: true, slug: true, color: true } },
        ediciones: { orderBy: { fechaInicio: 'desc' }, take: 3 },
        _count: { select: { ediciones: true } },
      },
      orderBy: { nombre: 'asc' },
    });
    res.json(courses);
  }),
);

coursesRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const course = await prisma.course.findUnique({
      where: { id: req.params.id },
      include: {
        area: true,
        ediciones: {
          orderBy: { fechaInicio: 'desc' },
          include: { _count: { select: { inscripciones: true, actividades: true } } },
        },
      },
    });
    if (!course) throw notFound('Curso no encontrado');
    res.json(course);
  }),
);

coursesRouter.post(
  '/',
  requireRole('ADMIN', 'STAFF'),
  validate(courseSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await prisma.course.create({ data: req.body }));
  }),
);

coursesRouter.patch(
  '/:id',
  requireRole('ADMIN', 'STAFF'),
  validate(courseSchema.partial()),
  asyncHandler(async (req, res) => {
    res.json(await prisma.course.update({ where: { id: req.params.id }, data: req.body }));
  }),
);

coursesRouter.delete(
  '/:id',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    res.json(await prisma.course.update({ where: { id: req.params.id }, data: { activo: false } }));
  }),
);
