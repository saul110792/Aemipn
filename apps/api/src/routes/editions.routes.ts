import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { badRequest, conflict, notFound } from '../lib/errors.js';
import { validate } from '../middleware/validate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const editionsRouter = Router();

/**
 * Estira la ventana de la edición para que cubra sus sesiones.
 *
 * Las salidas del CIM van una por semana, así que la edición dura semanas
 * aunque se haya capturado como un fin de semana; y mover una sesión más allá
 * del cierre dejaba la cabecera diciendo una cosa y el programa otra.
 *
 * Solo ensancha, nunca recorta: una edición puede abrir antes o cerrar después
 * de sus sesiones a propósito, y eso no es asunto de esta función.
 */
async function ajustarVentanaDeEdicion(
  tx: Pick<PrismaClient, 'editionActivity' | 'courseEdition'>,
  editionId: string,
) {
  const [extremos, edicion] = await Promise.all([
    tx.editionActivity.aggregate({
      where: { editionId },
      _min: { fechaInicio: true },
      _max: { fechaInicio: true },
    }),
    tx.courseEdition.findUnique({
      where: { id: editionId },
      select: { fechaInicio: true, fechaFin: true },
    }),
  ]);

  const primera = extremos._min.fechaInicio;
  const ultima = extremos._max.fechaInicio;
  if (!primera || !ultima || !edicion) return;

  const cambios: { fechaInicio?: Date; fechaFin?: Date } = {};
  if (primera < edicion.fechaInicio) cambios.fechaInicio = primera;
  // La última sesión cierra ese día, no a las 00:00.
  if (ultima > edicion.fechaFin) {
    const cierre = new Date(ultima);
    cierre.setHours(23, 59, 0, 0);
    cambios.fechaFin = cierre;
  }

  if (Object.keys(cambios).length) {
    await tx.courseEdition.update({ where: { id: editionId }, data: cambios });
  }
}
editionsRouter.use(requireAuth);

const editionBase = z.object({
    courseId: z.string().min(1),
    clave: z
    .string()
    .min(1, 'La clave es obligatoria')
    .transform((v) => v.trim().toUpperCase()),
    fechaInicio: z.coerce.date(),
    fechaFin: z.coerce.date(),
    inscripcionesAbren: z.coerce.date().optional().nullable(),
    inscripcionesCierran: z.coerce.date().optional().nullable(),
    cupo: z.coerce.number().int().positive().optional().nullable(),
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
    /** Qué clase de sesión es. Determina cómo se agrupa el programa. */
    kind: z
      .enum([
        'CLASE_TEORICA', 'SALIDA_1_DIA', 'CAMPAMENTO',
        'EXAMEN_TEORICO', 'EXAMEN_PRACTICO', 'PRESENTACION_FINAL', 'OTRA',
      ])
      .default('CLASE_TEORICA'),
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
const activityUpdateSchema = activityBase
  .partial()
  .extend({
    /// Si la fecha nueva cae donde ya hay otra sesion, se intercambian.
    intercambiarSiChoca: z.boolean().optional(),
  })
  .refine(rangoValido, mensajeRango);

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
                email: true, telefono: true, tipoSangre: true, alergias: true,
                servicioMedico: true, numeroAfiliacion: true,
                contactoEmergencia: true, telefonoEmergencia: true,
                contactoEmergencia2: true, telefonoEmergencia2: true, status: true,
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

/** Mismo dia natural, sin mirar la hora. */
const mismoDia = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/**
 * PATCH /api/editions/:id/activities/:activityId
 *
 * Mover una sesion al dia de otra no debe dejar dos encimadas: con
 * `intercambiarSiChoca` la que estorbaba se va al hueco que dejo la primera.
 * Asi se reordena el programa sin recapturar dos fechas, que es lo que pasa
 * cuando un puente obliga a correr una salida y las demas se recorren.
 * Ambas se escriben en una transaccion: media reprogramacion es peor que
 * ninguna.
 */
editionsRouter.patch(
  '/:id/activities/:activityId',
  requireRole('ADMIN', 'STAFF'),
  validate(activityUpdateSchema),
  asyncHandler(async (req, res) => {
    const { intercambiarSiChoca, ...cambios } = req.body as Record<string, unknown> & {
      intercambiarSiChoca?: boolean;
      fechaInicio?: Date;
    };

    const actual = await prisma.editionActivity.findUnique({
      where: { id: req.params.activityId },
    });
    if (!actual) throw notFound('Sesion no encontrada');

    const nuevaFecha = cambios.fechaInicio ? new Date(cambios.fechaInicio) : null;
    const cambiaDeDia = nuevaFecha !== null && !mismoDia(nuevaFecha, actual.fechaInicio);

    // Solo se busca estorbo cuando de verdad cambia de dia.
    const estorbo =
      intercambiarSiChoca && cambiaDeDia
        ? (
            await prisma.editionActivity.findMany({
              where: { editionId: actual.editionId, NOT: { id: actual.id } },
            })
          ).find((o) => mismoDia(o.fechaInicio, nuevaFecha!)) ?? null
        : null;

    const resultado = await prisma.$transaction(async (tx) => {
      if (estorbo) {
        // La desplazada hereda el dia que dejo libre la movida, conservando
        // su propia hora: cada salida tiene su horario y no debe perderlo.
        const conservaHora = (base: Date, referencia: Date) => {
          const d = new Date(base);
          d.setHours(referencia.getHours(), referencia.getMinutes(), 0, 0);
          return d;
        };

        const duracion = estorbo.fechaFin
          ? estorbo.fechaFin.getTime() - estorbo.fechaInicio.getTime()
          : null;
        const inicioDesplazada = conservaHora(actual.fechaInicio, estorbo.fechaInicio);

        await tx.editionActivity.update({
          where: { id: estorbo.id },
          data: {
            fechaInicio: inicioDesplazada,
            fechaFin: duracion === null ? null : new Date(inicioDesplazada.getTime() + duracion),
          },
        });
      }

      const guardada = await tx.editionActivity.update({
        where: { id: actual.id },
        data: cambios,
        include: { area: { select: { id: true, nombre: true, slug: true, color: true } } },
      });

      // Dentro de la transaccion: si la sesion se movio, la cabecera de la
      // edicion se mueve con ella o quedan contando historias distintas.
      await ajustarVentanaDeEdicion(tx, actual.editionId);

      return guardada;
    });

    res.json({
      ...resultado,
      // El cliente lo usa para decir con quien se intercambio.
      intercambiadaCon: estorbo ? { id: estorbo.id, titulo: estorbo.titulo } : null,
    });
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
 * DELETE /api/editions/:id
 *
 * Borrar de verdad, para la edicion que nunca arranco: se abrio, no hubo
 * suficientes interesados y se cierra sin dejar rastro. Solo se permite si
 * nadie se inscribio; con gente dentro hay que cancelar, porque su registro
 * es un hecho y borrarlo seria falsear el historial de esas personas.
 */
editionsRouter.delete(
  '/:id',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const edicion = await prisma.courseEdition.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { inscripciones: true } } },
    });
    if (!edicion) throw notFound('Edicion no encontrada');

    if (edicion._count.inscripciones > 0) {
      throw badRequest(
        `No se puede borrar: ya hay ${edicion._count.inscripciones} inscripcion(es). ` +
          'Cancelala en su lugar, para que quede constancia de lo que paso.',
      );
    }

    // Las sesiones se van con ella; no existen fuera de su edicion.
    await prisma.$transaction([
      prisma.editionActivity.deleteMany({ where: { editionId: edicion.id } }),
      prisma.courseEdition.delete({ where: { id: edicion.id } }),
    ]);

    res.json({ ok: true, clave: edicion.clave });
  }),
);

const cancelacionSchema = z.object({
  motivo: z.string().min(1, 'Escribe por que se cancela').max(400),
  /// Marca de baja a quien seguia inscrito. La edicion murio, no desertaron.
  darDeBajaInscritos: z.boolean().optional(),
});

/**
 * POST /api/editions/:id/cancelar
 *
 * Para la edicion que si arranco y no puede seguir. Conserva inscripciones,
 * programa y calificaciones: dentro de un año alguien va a preguntar que paso
 * con esa generacion, y una edicion borrada no responde nada.
 */
editionsRouter.post(
  '/:id/cancelar',
  requireRole('ADMIN', 'STAFF'),
  validate(cancelacionSchema),
  asyncHandler(async (req, res) => {
    const { motivo, darDeBajaInscritos } = req.body as z.infer<typeof cancelacionSchema>;

    const edicion = await prisma.courseEdition.findUnique({ where: { id: req.params.id } });
    if (!edicion) throw notFound('Edicion no encontrada');
    if (edicion.estado === 'CANCELADA') throw conflict('Esa edicion ya estaba cancelada');

    const resultado = await prisma.$transaction(async (tx) => {
      // A quien seguia en curso se le marca baja, no desercion: no abandono,
      // se quedo sin curso. Quien ya acredito o reprobo conserva su resultado.
      const bajas = darDeBajaInscritos
        ? (
            await tx.enrollment.updateMany({
              where: { editionId: edicion.id, status: { in: ['PREINSCRITO', 'INSCRITO'] } },
              data: { status: 'BAJA', notas: `Edicion cancelada: ${motivo}` },
            })
          ).count
        : 0;

      const actualizada = await tx.courseEdition.update({
        where: { id: edicion.id },
        data: {
          estado: 'CANCELADA',
          motivoCancelacion: motivo,
          canceladaEn: new Date(),
          canceladaPor: req.user!.email,
        },
      });

      return { actualizada, bajas };
    });

    res.json({ ...resultado.actualizada, inscritosDadosDeBaja: resultado.bajas });
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

    // Una salida por area, un fin de semana tras otro: asi se dan en la
    // practica. Son un punto de partida, no una programacion definitiva —
    // los puentes y el clima obligan a moverlas, y por eso se editan.
    const actividades = areas.map((area, i) => {
      const fechaInicio = new Date(edition.fechaInicio);
      fechaInicio.setDate(fechaInicio.getDate() + i * 7);
      fechaInicio.setHours(7, 0, 0, 0);

      const fechaFin = new Date(fechaInicio);
      fechaFin.setHours(18, 0, 0, 0);

      return {
        editionId: edition.id,
        areaId: area.id,
        kind: 'SALIDA_1_DIA' as const,
        titulo: `Salida de ${area.nombre}`,
        descripcion: `Sesion introductoria de ${area.nombre} dentro de ${edition.clave}.`,
        fechaInicio,
        fechaFin,
      };
    });

    await prisma.editionActivity.createMany({ data: actividades });
    // Ocho salidas semanales no caben en un fin de semana: la edicion se
    // estira hasta la ultima o la cabecera contradice al programa.
    await ajustarVentanaDeEdicion(prisma, edition.id);

    res.status(201).json({
      creadas: actividades.length,
      aviso:
        'Quedaron una por semana desde el inicio de la edicion. Ajusta fechas, ' +
        'lugares y areas desde el programa: los puentes y el clima suelen moverlas.',
    });
  }),
);
