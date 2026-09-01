import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { forbidden, notFound } from '../lib/errors.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { CARGOS_DE_MESA, enFunciones } from '../lib/jefaturas.js';

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
  _count: { select: { rsvps: true } },
} as const;

/**
 * Aplana el _count y agrega `voyAsistir`, sin exponer quién más confirmó:
 * eso solo lo ve quien puede editar el evento, por /asistentes.
 */
function conRsvp<T extends { id: string; _count: { rsvps: number } }>(
  evento: T,
  misRsvps: Set<string>,
) {
  const { _count, ...resto } = evento;
  return { ...resto, rsvpCount: _count.rsvps, voyAsistir: misRsvps.has(evento.id) };
}

/** Ids de evento a los que este miembro ya confirmó asistencia. */
async function misRsvpsDe(memberId: string | null, eventIds: string[]) {
  if (!memberId || eventIds.length === 0) return new Set<string>();
  const filas = await prisma.eventRsvp.findMany({
    where: { memberId, eventId: { in: eventIds } },
    select: { eventId: true },
  });
  return new Set(filas.map((f) => f.eventId));
}

/** Areas activas del usuario; base para decidir que eventos privados puede ver. */
async function areasDelUsuario(memberId: string | null) {
  if (!memberId) return [];
  const m = await prisma.areaMembership.findMany({
    where: { memberId, activo: true },
    select: { areaId: true },
  });
  return m.map((x) => x.areaId);
}

/** ¿Encabeza alguna área (jefe titular, interino o tesorero) en funciones? */
async function encabezaAlgunArea(memberId: string | null) {
  if (!memberId) return false;
  const j = await prisma.jefatura.findFirst({
    where: { memberId, ...enFunciones() },
    select: { id: true },
  });
  return Boolean(j);
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

    // Los eventos pasados solo interesan a quien gestiona: administracion y
    // quien encabeza un area. Un miembro que pida incluirPasados igual se
    // queda solo con lo proximo, sin necesidad de un error.
    const puedeVerPasados = esAdmin || (await encabezaAlgunArea(req.user!.memberId));

    const misAreas = esAdmin ? [] : await areasDelUsuario(req.user!.memberId);

    const where = {
      ...(areaId ? { areaId } : {}),
      ...(incluirPasados === 'true' && puedeVerPasados
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

    const eventos = await prisma.event.findMany({
      where,
      include: incluyeArea,
      orderBy: { fechaInicio: 'asc' },
    });
    const misRsvps = await misRsvpsDe(req.user!.memberId, eventos.map((e) => e.id));

    res.json(eventos.map((e) => conRsvp(e, misRsvps)));
  }),
);

/** ¿Puede esta persona ver este evento? Misma regla que aplica el listado. */
async function puedeVerEvento(
  user: { role: string; memberId: string | null },
  evento: { publicado: boolean; visibilidad: string; areaId: string | null },
) {
  if (user.role === 'ADMIN' || user.role === 'STAFF') return true;
  if (!evento.publicado) return false;
  if (evento.visibilidad === 'AREA') {
    const misAreas = await areasDelUsuario(user.memberId);
    return Boolean(evento.areaId && misAreas.includes(evento.areaId));
  }
  return true;
}

eventsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const evento = await prisma.event.findUnique({
      where: { id: req.params.id },
      include: incluyeArea,
    });
    if (!evento) throw notFound('Evento no encontrado');
    if (!(await puedeVerEvento(req.user!, evento))) {
      // Mismo mensaje que antes: no delatar si el problema es "no existe" o "es privado".
      if (!evento.publicado) throw notFound('Evento no encontrado');
      throw forbidden('Este evento es privado del área');
    }

    const misRsvps = await misRsvpsDe(req.user!.memberId, [evento.id]);
    res.json(conRsvp(evento, misRsvps));
  }),
);

/**
 * Puede crear y editar quien sea ADMIN/STAFF, el jefe/tesorero del area a
 * la que pertenece el evento, o el coordinador del CIM cuando el evento es
 * "de toda la asociacion" (sin area propia, como sus convocatorias).
 */
async function puedeEditar(
  user: { role: string; memberId: string | null },
  areaId: string | null | undefined,
) {
  if (user.role === 'ADMIN' || user.role === 'STAFF') return true;
  if (!areaId) return user.role === 'JEFE_CIM';
  if (!user.memberId) return false;

  const rol = await prisma.jefatura.findFirst({
    where: {
      memberId: user.memberId,
      areaId,
      cargo: { in: CARGOS_DE_MESA },
      ...enFunciones(),
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

    const creado = await prisma.event.create({ data, include: incluyeArea });
    res.status(201).json(conRsvp(creado, new Set()));
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

    const actualizado = await prisma.event.update({
      where: { id: actual.id },
      data: req.body,
      include: incluyeArea,
    });
    const misRsvps = await misRsvpsDe(req.user!.memberId, [actualizado.id]);
    res.json(conRsvp(actualizado, misRsvps));
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

/**
 * POST /api/events/:id/asistire — "voy a asistir".
 *
 * Solo a quien puede ver el evento: no tendría sentido confirmar asistencia
 * a algo que ni siquiera debería aparecerle. Sin miembro (una cuenta sin
 * ficha) no hay a quién asociar la confirmación.
 */
eventsRouter.post(
  '/:id/asistire',
  asyncHandler(async (req, res) => {
    if (!req.user!.memberId) throw forbidden('Tu cuenta no tiene ficha de miembro');

    const evento = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!evento) throw notFound('Evento no encontrado');
    if (!(await puedeVerEvento(req.user!, evento))) throw forbidden();

    await prisma.eventRsvp.upsert({
      where: { eventId_memberId: { eventId: evento.id, memberId: req.user!.memberId } },
      create: { eventId: evento.id, memberId: req.user!.memberId },
      update: {},
    });

    const rsvpCount = await prisma.eventRsvp.count({ where: { eventId: evento.id } });
    res.status(201).json({ voyAsistir: true, rsvpCount });
  }),
);

/** DELETE /api/events/:id/asistire — cancelar la confirmación. */
eventsRouter.delete(
  '/:id/asistire',
  asyncHandler(async (req, res) => {
    if (!req.user!.memberId) throw forbidden('Tu cuenta no tiene ficha de miembro');

    await prisma.eventRsvp.deleteMany({
      where: { eventId: req.params.id, memberId: req.user!.memberId },
    });

    const rsvpCount = await prisma.eventRsvp.count({ where: { eventId: req.params.id } });
    res.json({ voyAsistir: false, rsvpCount });
  }),
);

/**
 * GET /api/events/:id/asistentes — quién confirmó, con datos de contacto.
 *
 * Solo para quien puede editar el evento: es la misma logística que ya ve
 * en el roster de una edición, no algo para publicar a cualquiera.
 */
eventsRouter.get(
  '/:id/asistentes',
  asyncHandler(async (req, res) => {
    const evento = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!evento) throw notFound('Evento no encontrado');
    if (!(await puedeEditar(req.user!, evento.areaId))) throw forbidden();

    const confirmados = await prisma.eventRsvp.findMany({
      where: { eventId: evento.id },
      include: {
        member: {
          select: {
            id: true, nombre: true, apellidoPaterno: true, telefono: true,
            tipoSangre: true, alergias: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json(confirmados.map((c) => ({ ...c.member, confirmadoEl: c.createdAt })));
  }),
);
