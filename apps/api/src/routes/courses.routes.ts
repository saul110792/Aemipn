import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { notFound } from '../lib/errors.js';
import { validate } from '../middleware/validate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { siguienteClave, sugerirCodigo } from '../lib/claves.js';

export const coursesRouter = Router();
coursesRouter.use(requireAuth);

const courseSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  /// Encabeza la clave de cada edición: CBER -> CBER_2026A
  codigo: z
    .string()
    .regex(/^[A-Z0-9]{2,8}$/, 'El código va en mayúsculas, de 2 a 8 caracteres')
    .optional()
    .nullable(),
  nombre: z.string().min(1),
  kind: z.enum(['CIM', 'AREA', 'TALLER', 'CERTIFICACION']).default('TALLER'),
  descripcion: z.string().optional().nullable(),
  contenido: z.string().optional().nullable(),
  requisitos: z.string().optional().nullable(),
  duracionHoras: z.coerce.number().int().positive().optional().nullable(),
  areaId: z.string().optional().nullable(),
  activo: z.boolean().default(true),
});

coursesRouter.get(
  '/',
  validate(z.object({ kind: z.enum(['CIM', 'AREA', 'TALLER', 'CERTIFICACION']).optional(), areaId: z.string().optional() }), 'query'),
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
    const data = req.body as z.infer<typeof courseSchema>;
    // Sin código no se pueden generar claves de edición; se propone uno.
    const codigo = data.codigo?.toUpperCase() || sugerirCodigo(data.nombre);
    res.status(201).json(await prisma.course.create({ data: { ...data, codigo } }));
  }),
);

/**
 * GET /api/courses/:id/siguiente-clave?anio=2026
 * Propone la clave de la próxima edición: <CODIGO>_<AÑO><LETRA>.
 * Es una sugerencia; el formulario la deja editar.
 */
coursesRouter.get(
  '/:id/siguiente-clave',
  asyncHandler(async (req, res) => {
    const curso = await prisma.course.findUnique({
      where: { id: req.params.id },
      include: { ediciones: { select: { clave: true } } },
    });
    if (!curso) throw notFound('Curso no encontrado');

    const codigo = curso.codigo ?? sugerirCodigo(curso.nombre);
    const anio = Number(req.query.anio) || new Date().getFullYear();

    res.json({
      clave: siguienteClave(codigo, anio, curso.ediciones.map((e) => e.clave)),
      codigo,
      anio,
      codigoProvisional: !curso.codigo,
    });
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
