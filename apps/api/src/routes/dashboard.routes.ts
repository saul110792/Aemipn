import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { forbidden } from '../lib/errors.js';
import { requireAuth } from '../middleware/auth.js';
import { CARGOS_DE_MANDO, areasConCargo } from '../lib/jefaturas.js';

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

/**
 * GET /api/dashboard — cifras de un vistazo.
 *
 * La misma ruta sirve a dos lectores distintos. La mesa directiva ve la
 * asociación entera; un jefe ve **su área** y, aparte, el CIM: de ahí salen
 * los nuevos interesados y ahí cada área pone una salida, así que necesita
 * saber cuánta gente viene aunque todavía no sea suya.
 */
dashboardRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const esMesa = req.user!.role === 'ADMIN' || req.user!.role === 'STAFF';
    const misAreas = esMesa ? [] : await areasConCargo(req.user!.memberId, CARGOS_DE_MANDO);

    if (!esMesa && misAreas.length === 0) throw forbidden('No encabezas ninguna area');

    // Un solo juego de filtros, derivado del alcance. Si mañana cambia quién
    // ve qué, se cambia aquí y no en las siete consultas de abajo.
    const deMisAreas = esMesa ? {} : { areaId: { in: misAreas } };
    const edicionesDeMisAreas: Prisma.CourseEditionWhereInput = esMesa
      ? {}
      : { course: { areaId: { in: misAreas } } };

    const ahora = new Date();

    const [
      porStatus,
      porArea,
      solicitudesNuevas,
      declaracionesPendientes,
      edicionesActivas,
      pagosPendientes,
      proximasActividades,
      cim,
    ] = await Promise.all([
      prisma.member.groupBy({
        by: ['status'],
        _count: { _all: true },
        ...(esMesa ? {} : { where: { areas: { some: { areaId: { in: misAreas }, activo: true } } } }),
      }),
      prisma.area.findMany({
        where: { activa: true, ...(esMesa ? {} : { id: { in: misAreas } }) },
        orderBy: { orden: 'asc' },
        select: {
          id: true, nombre: true, slug: true, color: true,
          _count: { select: { miembros: { where: { activo: true } } } },
        },
      }),
      // Las solicitudes de ingreso son de la asociación, no de un área.
      esMesa
        ? prisma.membershipApplication.count({ where: { status: { in: ['NUEVA', 'EN_REVISION'] } } })
        : Promise.resolve(0),
      prisma.courseClaim.count({
        where: { status: 'PENDIENTE', ...(esMesa ? {} : { course: { areaId: { in: misAreas } } }) },
      }),
      prisma.courseEdition.findMany({
        where: { estado: { in: ['INSCRIPCIONES_ABIERTAS', 'EN_CURSO'] }, ...edicionesDeMisAreas },
        orderBy: { fechaInicio: 'asc' },
        include: {
          course: { select: { nombre: true, kind: true } },
          _count: { select: { inscripciones: true } },
        },
      }),
      prisma.enrollment.count({
        where: {
          paymentStatus: { in: ['PENDIENTE', 'PARCIAL'] },
          ...(esMesa ? {} : { edition: edicionesDeMisAreas }),
        },
      }),
      prisma.editionActivity.findMany({
        where: {
          fechaInicio: { gte: ahora },
          // Una salida del CIM la imparte un área aunque la edición sea del CIM:
          // por eso vale cualquiera de los dos caminos.
          ...(esMesa ? {} : { OR: [deMisAreas, { edition: edicionesDeMisAreas }] }),
        },
        orderBy: { fechaInicio: 'asc' },
        take: 8,
        include: {
          area: { select: { nombre: true, color: true } },
          edition: { select: { clave: true } },
          responsable: { select: { nombre: true, apellidoPaterno: true } },
        },
      }),
      estadisticasDelCim(misAreas, esMesa, ahora),
    ]);

    res.json({
      alcance: esMesa ? 'MESA' : 'AREA',
      areasQueEncabeza: porArea.map((a) => ({ id: a.id, nombre: a.nombre })),
      miembros: {
        total: porStatus.reduce((acc, s) => acc + s._count._all, 0),
        porStatus: Object.fromEntries(porStatus.map((s) => [s.status, s._count._all])),
      },
      areas: porArea.map((a) => ({ ...a, miembros: a._count.miembros })),
      solicitudesNuevas,
      declaracionesPendientes,
      edicionesActivas,
      pagosPendientes,
      proximasActividades,
      cim,
    });
  }),
);

/**
 * El CIM lo ven todos los jefes, encabecen el área que encabecen.
 *
 * Es la puerta de entrada a la asociación: quien viene ahí todavía no es de
 * nadie, y cada área manda una salida para darse a conocer. Ocultárselo a un
 * jefe sería esconderle justamente a sus futuros miembros.
 */
async function estadisticasDelCim(misAreas: string[], esMesa: boolean, ahora: Date) {
  const [ediciones, historicas] = await Promise.all([
    prisma.courseEdition.findMany({
      where: { course: { kind: 'CIM' }, estado: { in: ['BORRADOR', 'INSCRIPCIONES_ABIERTAS', 'EN_CURSO'] } },
      orderBy: { fechaInicio: 'asc' },
      include: {
        course: { select: { nombre: true } },
        inscripciones: { select: { status: true, memberId: true } },
        actividades: {
          where: { fechaInicio: { gte: ahora } },
          orderBy: { fechaInicio: 'asc' },
          include: { area: { select: { id: true, nombre: true, slug: true, color: true } } },
        },
      },
    }),
    prisma.courseEdition.findMany({
      where: { course: { kind: 'CIM' }, estado: { in: ['CONCLUIDA', 'CANCELADA'] } },
      orderBy: { fechaInicio: 'desc' },
      take: 3,
      select: {
        id: true, clave: true, estado: true, fechaInicio: true,
        inscripciones: { select: { status: true } },
      },
    }),
  ]);

  const inscritos = ediciones.flatMap((e) => e.inscripciones);
  const ids = [...new Set(inscritos.map((i) => i.memberId))];

  // "Nuevo interesado" = está en el CIM y todavía no pertenece a ningún área.
  // Sin esta resta, quien repite el CIM contaría como recién llegado.
  const yaSonDeAlguna = ids.length
    ? await prisma.areaMembership.findMany({
        where: { memberId: { in: ids }, activo: true },
        select: { memberId: true },
        distinct: ['memberId'],
      })
    : [];

  const cuentaPorEstado = (filas: { status: string }[]) =>
    filas.reduce<Record<string, number>>((acc, f) => {
      acc[f.status] = (acc[f.status] ?? 0) + 1;
      return acc;
    }, {});

  return {
    interesados: ids.length,
    nuevos: ids.length - yaSonDeAlguna.length,
    porEstado: cuentaPorEstado(inscritos),
    ediciones: ediciones.map((e) => ({
      id: e.id,
      clave: e.clave,
      estado: e.estado,
      fechaInicio: e.fechaInicio,
      fechaFin: e.fechaFin,
      inscritos: e.inscripciones.length,
      cupo: e.cupo,
      // La salida que le toca a este jefe, para que no la busque en el calendario.
      misSalidas: esMesa
        ? []
        : e.actividades
            .filter((a) => a.areaId && misAreas.includes(a.areaId))
            .map((a) => ({ id: a.id, titulo: a.titulo, fechaInicio: a.fechaInicio, area: a.area })),
      salidas: e.actividades.map((a) => ({
        id: a.id,
        titulo: a.titulo,
        fechaInicio: a.fechaInicio,
        area: a.area,
        propia: Boolean(a.areaId && misAreas.includes(a.areaId)),
      })),
    })),
    historial: historicas.map((e) => ({
      id: e.id,
      clave: e.clave,
      estado: e.estado,
      fechaInicio: e.fechaInicio,
      total: e.inscripciones.length,
      porEstado: cuentaPorEstado(e.inscripciones),
    })),
  };
}
