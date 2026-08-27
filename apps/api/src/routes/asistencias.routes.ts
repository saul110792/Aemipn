import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { forbidden, notFound } from '../lib/errors.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { idempotencia } from '../middleware/idempotencia.js';
import { CARGOS_DE_MANDO, areasConCargo } from '../lib/jefaturas.js';

export const asistenciasRouter = Router();
asistenciasRouter.use(requireAuth);

const ESTADOS = ['PRESENTE', 'TARDE', 'JUSTIFICADO', 'AUSENTE'] as const;

const marcaSchema = z.object({
  memberId: z.string().min(1),
  estado: z.enum(ESTADOS),
  nota: z.string().max(300).optional().nullable(),
  /// Hora del dispositivo. Si viene, gana sobre la del servidor: la lista se
  /// levanta en el cerro y puede subir horas después.
  registradaEn: z.coerce.date().optional(),
});

const loteSchema = z.object({
  marcas: z.array(marcaSchema).min(1).max(200),
});

/**
 * ¿Puede esta persona pasar lista de esta sesión?
 *
 * La imparte quien encabeza el área, o quien quedó como responsable de la
 * sesión aunque no mande en el área. La mesa directiva siempre puede.
 */
async function puedeTomarLista(
  user: { role: string; memberId: string | null },
  actividad: { areaId: string | null; responsableId: string | null; edition: { course: { areaId: string | null } } },
) {
  if (user.role === 'ADMIN' || user.role === 'STAFF') return true;
  if (!user.memberId) return false;
  if (actividad.responsableId === user.memberId) return true;

  // Una salida del CIM la imparte un área aunque la edición sea del CIM.
  const suArea = actividad.areaId ?? actividad.edition.course.areaId;
  if (!suArea) return user.role === 'JEFE_CIM';

  const mando = await areasConCargo(user.memberId, CARGOS_DE_MANDO);
  return mando.includes(suArea);
}

async function traerActividad(id: string) {
  const actividad = await prisma.editionActivity.findUnique({
    where: { id },
    select: {
      id: true,
      titulo: true,
      fechaInicio: true,
      areaId: true,
      responsableId: true,
      editionId: true,
      edition: { select: { course: { select: { areaId: true } } } },
    },
  });
  if (!actividad) throw notFound('Sesion no encontrada');
  return actividad;
}

/**
 * GET /api/asistencias/actividad/:actividadId
 * La lista para pasar: todos los inscritos de la edición, con su marca si ya
 * la tienen. Se devuelven **todos** aunque nadie los haya marcado, porque una
 * lista incompleta no sirve para pasar lista.
 */
asistenciasRouter.get(
  '/actividad/:actividadId',
  asyncHandler(async (req, res) => {
    const actividad = await traerActividad(req.params.actividadId);
    const puede = await puedeTomarLista(req.user!, actividad);

    const [inscritos, marcas] = await Promise.all([
      prisma.enrollment.findMany({
        where: { editionId: actividad.editionId, status: { notIn: ['BAJA'] } },
        select: {
          status: true,
          member: {
            select: { id: true, nombre: true, apellidoPaterno: true, apellidoMaterno: true, fotoUrl: true },
          },
        },
        orderBy: [{ member: { apellidoPaterno: 'asc' } }, { member: { nombre: 'asc' } }],
      }),
      prisma.asistencia.findMany({
        where: { actividadId: actividad.id },
        include: { registradaPor: { select: { id: true, nombre: true, apellidoPaterno: true } } },
      }),
    ]);

    // Un miembro raso solo puede consultar la suya.
    const soloLaSuya = !puede;
    const porMiembro = new Map(marcas.map((m) => [m.memberId, m]));

    const lista = inscritos
      .filter((i) => !soloLaSuya || i.member.id === req.user!.memberId)
      .map((i) => {
        const marca = porMiembro.get(i.member.id);
        return {
          member: i.member,
          statusInscripcion: i.status,
          estado: marca?.estado ?? null,
          nota: marca?.nota ?? null,
          registradaEn: marca?.registradaEn ?? null,
          registradaPor: marca?.registradaPor ?? null,
          // Delata que se tomó sin señal y subió después. Sin esto, una lista
          // sincronizada tarde parece capturada tarde.
          subidaEn: marca && marca.createdAt.getTime() - marca.registradaEn.getTime() > 60_000
            ? marca.createdAt
            : null,
        };
      });

    res.json({
      actividad: {
        id: actividad.id,
        titulo: actividad.titulo,
        fechaInicio: actividad.fechaInicio,
      },
      puedeTomarLista: puede,
      lista,
    });
  }),
);

/**
 * PUT /api/asistencias/actividad/:actividadId — pasar lista, de un jalón.
 *
 * Va en lote porque así se pasa lista de verdad: se recorre al grupo una vez y
 * se manda todo junto. Y porque una app sin señal guarda una sola acción en su
 * cola en vez de treinta.
 *
 * Acepta `Idempotency-Key`: repetir el envío no duplica ni revierte nada.
 */
asistenciasRouter.put(
  '/actividad/:actividadId',
  idempotencia,
  validate(loteSchema),
  asyncHandler(async (req, res) => {
    const actividad = await traerActividad(req.params.actividadId);

    if (!(await puedeTomarLista(req.user!, actividad))) {
      throw forbidden('Solo el area que imparte la sesion puede pasar lista');
    }

    const { marcas } = req.body as z.infer<typeof loteSchema>;
    const ahora = new Date();

    // Nadie puede quedar en la lista si no está inscrito en la edición.
    const inscritos = await prisma.enrollment.findMany({
      where: { editionId: actividad.editionId, memberId: { in: marcas.map((m) => m.memberId) } },
      select: { memberId: true },
    });
    const validos = new Set(inscritos.map((i) => i.memberId));
    const ajenos = marcas.filter((m) => !validos.has(m.memberId));
    if (ajenos.length) {
      throw forbidden(`${ajenos.length} persona(s) de la lista no estan inscritas en esta edicion`);
    }

    await prisma.$transaction(
      marcas.map((m) =>
        prisma.asistencia.upsert({
          where: { actividadId_memberId: { actividadId: actividad.id, memberId: m.memberId } },
          create: {
            actividadId: actividad.id,
            memberId: m.memberId,
            estado: m.estado,
            nota: m.nota ?? null,
            registradaPorId: req.user!.memberId,
            registradaEn: m.registradaEn ?? ahora,
          },
          update: {
            estado: m.estado,
            nota: m.nota ?? null,
            registradaPorId: req.user!.memberId,
            registradaEn: m.registradaEn ?? ahora,
          },
        }),
      ),
    );

    const resumen = marcas.reduce<Record<string, number>>((acc, m) => {
      acc[m.estado] = (acc[m.estado] ?? 0) + 1;
      return acc;
    }, {});

    res.json({ ok: true, registradas: marcas.length, resumen });
  }),
);

/**
 * GET /api/asistencias/miembro/:memberId — su asistencia a lo largo del curso.
 * Cada quien ve la suya; el área que imparte y la mesa ven la de sus inscritos.
 */
asistenciasRouter.get(
  '/miembro/:memberId',
  asyncHandler(async (req, res) => {
    const esMesa = req.user!.role === 'ADMIN' || req.user!.role === 'STAFF';
    const esSuya = req.user!.memberId === req.params.memberId;

    if (!esMesa && !esSuya) {
      const mando = await areasConCargo(req.user!.memberId, CARGOS_DE_MANDO);
      if (mando.length === 0) throw forbidden('Solo puedes consultar tu propia asistencia');

      const comparte = await prisma.asistencia.findFirst({
        where: {
          memberId: req.params.memberId,
          OR: [
            { actividad: { areaId: { in: mando } } },
            { actividad: { edition: { course: { areaId: { in: mando } } } } },
          ],
        },
        select: { id: true },
      });
      if (!comparte) throw forbidden('Esa persona no ha tomado sesiones de tu area');
    }

    const asistencias = await prisma.asistencia.findMany({
      where: { memberId: req.params.memberId },
      include: {
        actividad: {
          select: {
            id: true, titulo: true, kind: true, fechaInicio: true,
            edition: { select: { id: true, clave: true, course: { select: { nombre: true } } } },
          },
        },
      },
      orderBy: { actividad: { fechaInicio: 'desc' } },
    });

    res.json(asistencias);
  }),
);
