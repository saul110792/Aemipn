import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { notFound } from '../lib/errors.js';
import { validate } from '../middleware/validate.js';
import { requireAreaRole, requireAuth, requireRole } from '../middleware/auth.js';

export const areasRouter = Router();
areasRouter.use(requireAuth);

const areaSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/, 'El slug solo admite minusculas, numeros y guiones'),
  codigo: z
    .string()
    .regex(/^[A-Z0-9]{1,6}$/, 'El código va en mayúsculas, de 1 a 6 caracteres')
    .optional()
    .nullable(),
  nombre: z.string().min(1),
  descripcion: z.string().optional().nullable(),
  contenido: z.string().optional().nullable(),
  imagenUrl: z.string().optional().nullable(),
  /// Fotos de la actividad para el carrusel publico.
  galeria: z.array(z.string()).max(12, 'Máximo 12 fotos por área').optional(),
  color: z.string().optional().nullable(),
  orden: z.coerce.number().int().default(0),
  activa: z.boolean().default(true),
});

areasRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const areas = await prisma.area.findMany({
      orderBy: { orden: 'asc' },
      include: {
        _count: { select: { miembros: { where: { activo: true } }, cursos: true } },
      },
    });
    res.json(areas);
  }),
);

/** GET /api/areas/:areaId — incluye la mesa del area y su padron. */
areasRouter.get(
  '/:areaId',
  asyncHandler(async (req, res) => {
    const area = await prisma.area.findUnique({
      where: { id: req.params.areaId },
      include: {
        miembros: {
          where: { activo: true },
          include: {
            member: {
              select: {
                id: true, nombre: true, apellidoPaterno: true, apellidoMaterno: true,
                email: true, telefono: true, status: true, fotoUrl: true,
              },
            },
          },
          orderBy: [{ role: 'asc' }],
        },
        cursos: { include: { _count: { select: { ediciones: true } } } },
      },
    });

    if (!area) throw notFound('Area no encontrada');

    const ahora = new Date();
    const conMando = area.miembros.filter(
      (m) =>
        (m.role === 'JEFE_DE_AREA' || m.role === 'JEFE_INTERINO') &&
        (!m.hasta || m.hasta >= ahora),
    );

    res.json({
      ...area,
      // En plural a proposito: hay co-jefaturas, y un interino puede convivir
      // con un titular. Devolver solo el primero los escondia.
      jefes: conMando,
      tesoreros: area.miembros.filter((m) => m.role === 'TESORERO'),
      /// Nombramientos de mando ya vencidos, para poder mostrarlos como historia.
      mandosVencidos: area.miembros.filter(
        (m) =>
          (m.role === 'JEFE_DE_AREA' || m.role === 'JEFE_INTERINO') &&
          m.hasta !== null &&
          m.hasta < ahora,
      ),
    });
  }),
);

areasRouter.post(
  '/',
  requireRole('ADMIN'),
  validate(areaSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await prisma.area.create({ data: req.body }));
  }),
);

/** El jefe de area puede editar la ficha informativa de su propia area. */
areasRouter.patch(
  '/:areaId',
  requireAreaRole(['JEFE_DE_AREA']),
  validate(areaSchema.partial()),
  asyncHandler(async (req, res) => {
    res.json(await prisma.area.update({ where: { id: req.params.areaId }, data: req.body }));
  }),
);

areasRouter.delete(
  '/:areaId',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    res.json(
      await prisma.area.update({ where: { id: req.params.areaId }, data: { activa: false } }),
    );
  }),
);
