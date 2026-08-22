import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { badRequest, conflict, notFound } from '../lib/errors.js';
import { validate } from '../middleware/validate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const editionsRouter = Router();
editionsRouter.use(requireAuth);

const editionBase = z.object({
    courseId: z.string().min(1),
    clave: z.string().min(1, 'La clave es obligatoria (ej. "CIM 2026-1")'),
    fechaInicio: z.coerce.date(),
    fechaFin: z.coerce.date(),
    inscripcionesAbren: z.coerce.date().optional().nullable(),
    inscripcionesCierran: z.coerce.date().optional().nullable(),
    cupo: z.coerce.number().int().positive().optional().nullable(),
    costo: z.coerce.number().nonnegative().optional().nullable(),
    sede: z.string().optional().nullable(),
    estado: z
      .enum(['BORRADOR', 'INSCRIPCIONES_ABIERTAS', 'EN_CURSO', 'CONCLUIDA', 'CANCELADA'])
      .default('BORRADOR'),
    notas: z.string().optional().nullable(),
});

/** El rango solo se puede validar cuando vienen ambas fechas (en PATCH puede faltar una). */
const rangoValido = (d: { fechaInicio?: Date | null; fechaFin?: Date | null }) =>
  !d.fechaInicio || !d.fechaFin || d.fechaFin >= d.fechaInicio;

const mensajeRango = {
  message: 'La fecha de fin no puede ser anterior a la de inicio',
  path: ['fechaFin'],
};

const editionSchema = editionBase.refine(rangoValido, mensajeRango);
const editionUpdateSchema = editionBase.partial().refine(rangoValido, mensajeRango);

const activityBase = z.object({
    areaId: z.string().optional().nullable(),
    titulo: z.string().min(1),
    descripcion: z.string().optional().nullable(),
    fechaInicio: z.coerce.date(),
    fechaFin: z.coerce.date().optional().nullable(),
    lugar: z.string().optional().nullable(),
    cupo: z.coerce.number().int().positive().optional().nullable(),
    responsableId: z.string().optional().nullable(),
});

const activitySchema = activityBase.refine(rangoValido, mensajeRango);
const activityUpdateSchema = activityBase.partial().refine(rangoValido, mensajeRango);

editionsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { estado, courseId } = req.query as { estado?: never; courseId?: string };
    const ediciones = await prisma.courseEdition.findMany({
      where: { ...(estado ? { estado } : {}), ...(courseId ? { courseId } : {}) },
      include: {
        course: { include: { area: { select: { nombre: true, slug: true, color: true } } } },
        _count: { select: { inscripciones: true, actividades: true } },
      },
      orderBy: { fechaInicio: 'desc' },
    });
    res.json(ediciones);
  }),
);

/** GET /api/editions/:id — la edicion con su roster y sus salidas por area. */
editionsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const edition = await prisma.courseEdition.findUnique({
      where: { id: req.params.id },
      include: {
        course: { include: { area: true } },
        actividades: {
          include: {
            area: { select: { id: true, nombre: true, slug: true, color: true } },
            responsable: { select: { id: true, nombre: true, apellidoPaterno: true } },
          },
          orderBy: { fechaInicio: 'asc' },
        },
        inscripciones: {
          include: {
            member: {
              select: {
                id: true, nombre: true, apellidoPaterno: true, apellidoMaterno: true,
                email: true, telefono: true, tipoSangre: true, contactoEmergencia: true,
                telefonoEmergencia: true, status: true,
              },
            },
          },
          orderBy: { fechaInscripcion: 'asc' },
        },
      },
    });

    if (!edition) throw notFound('Edicion no encontrada');

    const cupoRestante =
      edition.cupo === null
        ? null
        : edition.cupo - edition.inscripciones.filter((i) => i.status !== 'BAJA').length;

    res.json({ ...edition, cupoRestante });
  }),
);

editionsRouter.post(
  '/',
  requireRole('ADMIN', 'STAFF'),
  validate(editionSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await prisma.courseEdition.create({ data: req.body }));
  }),
);

editionsRouter.patch(
  '/:id',
  requireRole('ADMIN', 'STAFF'),
  validate(editionUpdateSchema),
  asyncHandler(async (req, res) => {
    res.json(await prisma.courseEdition.update({ where: { id: req.params.id }, data: req.body }));
  }),
);

/**
 * POST /api/editions/:id/activities — agregar una salida a la edicion.
 * En el CIM se crea una por area para que los aspirantes conozcan cada disciplina.
 */
editionsRouter.post(
  '/:id/activities',
  requireRole('ADMIN', 'STAFF'),
  validate(activitySchema),
  asyncHandler(async (req, res) => {
    const edition = await prisma.courseEdition.findUnique({ where: { id: req.params.id } });
    if (!edition) throw notFound('Edicion no encontrada');

    const actividad = await prisma.editionActivity.create({
      data: { ...req.body, editionId: edition.id },
      include: { area: true },
    });

    res.status(201).json(actividad);
  }),
);

editionsRouter.patch(
  '/:id/activities/:activityId',
  requireRole('ADMIN', 'STAFF'),
  validate(activityUpdateSchema),
  asyncHandler(async (req, res) => {
    res.json(
      await prisma.editionActivity.update({
        where: { id: req.params.activityId },
        data: req.body,
      }),
    );
  }),
);

editionsRouter.delete(
  '/:id/activities/:activityId',
  requireRole('ADMIN', 'STAFF'),
  asyncHandler(async (req, res) => {
    await prisma.editionActivity.delete({ where: { id: req.params.activityId } });
    res.json({ ok: true });
  }),
);

/**
 * POST /api/editions/:id/activities/generar-cim
 * Atajo: crea de golpe una salida por cada area activa para una edicion del CIM.
 */
editionsRouter.post(
  '/:id/activities/generar-cim',
  requireRole('ADMIN', 'STAFF'),
  asyncHandler(async (req, res) => {
    const edition = await prisma.courseEdition.findUnique({
      where: { id: req.params.id },
      include: { course: true, actividades: true },
    });
    if (!edition) throw notFound('Edicion no encontrada');
    if (edition.course.kind !== 'CIM') {
      throw badRequest('Este atajo solo aplica a ediciones del CIM');
    }
    if (edition.actividades.length > 0) {
      throw conflict('La edicion ya tiene actividades; agregalas o editalas una por una');
    }

    const areas = await prisma.area.findMany({ where: { activa: true }, orderBy: { orden: 'asc' } });

    // Una salida por area, espaciadas un dia a partir del inicio de la edicion.
    const actividades = areas.map((area, i) => {
      const fechaInicio = new Date(edition.fechaInicio);
      fechaInicio.setDate(fechaInicio.getDate() + i);
      return {
        editionId: edition.id,
        areaId: area.id,
        titulo: `Salida de ${area.nombre}`,
        descripcion: `Sesion introductoria de ${area.nombre} dentro de ${edition.clave}.`,
        fechaInicio,
      };
    });

    await prisma.editionActivity.createMany({ data: actividades });

    res.status(201).json({
      creadas: actividades.length,
      aviso: 'Ajusta fechas, lugares y responsables de cada salida desde el panel.',
    });
  }),
);
