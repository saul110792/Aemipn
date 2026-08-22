import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { forbidden, notFound } from '../lib/errors.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';

export const eventsRouter = Router();
eventsRouter.use(requireAuth);

const eventBase = z.object({
  titulo: z.string().min(1, 'El título es obligatorio'),
  descripcion: z.string().max(600).optional().nullable(),
  contenido: z.string().optional().nullable(),
  kind: z.enum(['CURSO', 'TALLER', 'SALIDA', 'REUNION', 'CONVOCATORIA', 'OTRO']).default('TALLER'),
  modalidad: z.enum(['PRESENCIAL', 'EN_LINEA', 'HIBRIDA']).default('PRESENCIAL'),
  lugar: z.string().optional().nullable(),
  urlVideoconferencia: z.string().url('Debe ser una URL válida').optional().nullable(),
  fechaInicio: z.coerce.date(),
  fechaFin: z.coerce.date().optional().nullable(),
  areaId: z.string().optional().nullable(),
  visibilidad: z.enum(['PUBLICO', 'MIEMBROS', 'AREA']).default('PUBLICO'),
  publicado: z.boolean().default(false),
  imagenUrl: z.string().optional().nullable(),
  cupo: z.coerce.number().int().positive().optional().nullable(),
  costo: z.coerce.number().nonnegative().optional().nullable(),
  registroUrl: z.string().url('Debe ser una URL válida').optional().nullable(),
});

/**
 * La modalidad decide que datos de ubicacion son obligatorios: no sirve de nada
 * anunciar un taller en linea sin liga, ni uno presencial sin domicilio.
 */
/** Forma comun a la validacion completa (POST) y a la parcial (PATCH). */
type Revisable = Partial<{
  modalidad: 'PRESENCIAL' | 'EN_LINEA' | 'HIBRIDA';
  lugar: string | null;
  urlVideoconferencia: string | null;
  visibilidad: 'PUBLICO' | 'MIEMBROS' | 'AREA';
  areaId: string | null;
  fechaInicio: Date;
  fechaFin: Date | null;
}>;

const ubicacionCoherente = (d: Revisable, ctx: z.RefinementCtx) => {
  if (!d.modalidad) return;
  const necesitaLugar = d.modalidad === 'PRESENCIAL' || d.modalidad === 'HIBRIDA';
  const necesitaLiga = d.modalidad === 'EN_LINEA' || d.modalidad === 'HIBRIDA';

  if (necesitaLugar && !d.lugar?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['lugar'],
      message: 'Indica el lugar para un evento presencial',
    });
  }
  if (necesitaLiga && !d.urlVideoconferencia?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['urlVideoconferencia'],
      message: 'Indica la liga de videoconferencia para un evento en línea',
    });
  }
};

/** Un evento restringido a un area necesita saber a que area. */
const areaCoherente = (d: Revisable, ctx: z.RefinementCtx) => {
  if (d.visibilidad === 'AREA' && !d.areaId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['areaId'],
      message: 'Un evento privado de área debe indicar el área',
    });
  }
};

const rangoCoherente = (d: Revisable, ctx: z.RefinementCtx) => {
  if (d.fechaInicio && d.fechaFin && d.fechaFin < d.fechaInicio) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['fechaFin'],
      message: 'La fecha de fin no puede ser anterior a la de inicio',
    });
  }
};

const revisar = (d: Revisable, ctx: z.RefinementCtx) => {
  ubicacionCoherente(d, ctx);
  areaCoherente(d, ctx);
  rangoCoherente(d, ctx);
};

const eventSchema = eventBase.superRefine(revisar);
const eventUpdateSchema = eventBase.partial().superRefine(revisar);

const incluyeArea = {
  area: { select: { id: true, nombre: true, slug: true, color: true } },
} as const;

/** Areas activas del usuario; base para decidir que eventos privados puede ver. */
async function areasDelUsuario(memberId: string | null) {
  if (!memberId) return [];
  const m = await prisma.areaMembership.findMany({
    where: { memberId, activo: true },
    select: { areaId: true },
  });
  return m.map((x) => x.areaId);
}

/**
 * GET /api/events
 * Un ADMIN/STAFF ve todo. Un miembro ve lo publico, lo de miembros, y lo
 * privado unicamente de las areas a las que pertenece.
 */
eventsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { areaId, desde, incluirPasados } = req.query as Record<string, string | undefined>;
    const esAdmin = req.user!.role === 'ADMIN' || req.user!.role === 'STAFF';

    const misAreas = esAdmin ? [] : await areasDelUsuario(req.user!.memberId);

    const where = {
      ...(areaId ? { areaId } : {}),
      ...(incluirPasados === 'true'
        ? {}
        : { fechaInicio: { gte: desde ? new Date(desde) : new Date() } }),
      ...(esAdmin
        ? {}
        : {
            publicado: true,
            OR: [
              { visibilidad: 'PUBLICO' as const },
              { visibilidad: 'MIEMBROS' as const },
              { visibilidad: 'AREA' as const, areaId: { in: misAreas } },
            ],
          }),
    };

    res.json(
      await prisma.event.findMany({
        where,
        include: incluyeArea,
        orderBy: { fechaInicio: 'asc' },
      }),
    );
  }),
);

eventsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const evento = await prisma.event.findUnique({
      where: { id: req.params.id },
      include: incluyeArea,
    });
    if (!evento) throw notFound('Evento no encontrado');

    const esAdmin = req.user!.role === 'ADMIN' || req.user!.role === 'STAFF';
    if (!esAdmin) {
      if (!evento.publicado) throw notFound('Evento no encontrado');
      if (evento.visibilidad === 'AREA') {
        const misAreas = await areasDelUsuario(req.user!.memberId);
        if (!evento.areaId || !misAreas.includes(evento.areaId)) {
          throw forbidden('Este evento es privado del área');
        }
      }
    }

    res.json(evento);
  }),
);

/**
 * Puede crear y editar quien sea ADMIN/STAFF, o el jefe/tesorero del area
 * a la que pertenece el evento. Asi cada area publica lo suyo.
 */
async function puedeEditar(
  user: { role: string; memberId: string | null },
  areaId: string | null | undefined,
) {
  if (user.role === 'ADMIN' || user.role === 'STAFF') return true;
  if (!areaId || !user.memberId) return false;

  const rol = await prisma.areaMembership.findFirst({
    where: {
      memberId: user.memberId,
      areaId,
      activo: true,
      role: { in: ['JEFE_DE_AREA', 'TESORERO'] },
    },
    select: { id: true },
  });
  return Boolean(rol);
}

eventsRouter.post(
  '/',
  validate(eventSchema),
  asyncHandler(async (req, res) => {
    const data = req.body as z.infer<typeof eventBase>;

    if (!(await puedeEditar(req.user!, data.areaId))) {
      throw forbidden('Solo puedes publicar eventos de tu área');
    }

    res.status(201).json(await prisma.event.create({ data, include: incluyeArea }));
  }),
);

eventsRouter.patch(
  '/:id',
  validate(eventUpdateSchema),
  asyncHandler(async (req, res) => {
    const actual = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!actual) throw notFound('Evento no encontrado');

    if (!(await puedeEditar(req.user!, actual.areaId))) throw forbidden();

    // Al mover un evento a otra area, hay que poder editar tambien la destino.
    const nuevaArea = (req.body as { areaId?: string | null }).areaId;
    if (nuevaArea !== undefined && nuevaArea !== actual.areaId) {
      if (!(await puedeEditar(req.user!, nuevaArea))) {
        throw forbidden('No puedes mover el evento a esa área');
      }
    }

    res.json(
      await prisma.event.update({
        where: { id: actual.id },
        data: req.body,
        include: incluyeArea,
      }),
    );
  }),
);

eventsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const actual = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!actual) throw notFound('Evento no encontrado');
    if (!(await puedeEditar(req.user!, actual.areaId))) throw forbidden();

    await prisma.event.delete({ where: { id: actual.id } });
    res.json({ ok: true });
  }),
);
