import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { enFunciones } from '../lib/jefaturas.js';

export const calendarioRouter = Router();
calendarioRouter.use(requireAuth);

/** Una cosa que ocupa fechas en el calendario. */
interface Entrada {
  id: string;
  tipo: 'SESION' | 'EVENTO' | 'EDICION';
  titulo: string;
  detalle: string | null;
  inicio: string;
  fin: string;
  lugar: string | null;
  area: { id: string; nombre: string; slug: string; color: string | null } | null;
  ruta: string;
  /// true cuando el bloque es de otra area y solo se muestra para no encimar.
  ajeno: boolean;
}

const rangoSchema = z.object({
  desde: z.coerce.date(),
  hasta: z.coerce.date(),
});

/** Sin hora de fin, una actividad ocupa su día. */
const finDe = (inicio: Date, fin: Date | null) => (fin ?? inicio).toISOString();

/**
 * GET /api/calendario?desde=&hasta=
 *
 * Qué ve cada quien:
 *  - Mesa directiva: todo.
 *  - Jefe o tesorero de área: lo suyo, y además **los cursos de las demás
 *    áreas**, porque para programar sin encimarse hace falta ver el calendario
 *    completo. Eso es una excepción deliberada al aislamiento entre áreas, y
 *    solo alcanza a los cursos: los eventos privados de otra área no se filtran.
 *  - Miembro: lo de sus áreas, más lo público y lo de todos los miembros.
 */
calendarioRouter.get(
  '/',
  validate(rangoSchema, 'query'),
  asyncHandler(async (req, res) => {
    const { desde, hasta } = req.query as unknown as z.infer<typeof rangoSchema>;
    const esAdmin = req.user!.role === 'ADMIN' || req.user!.role === 'STAFF';

    // Pertenecer al area decide qué se ve; encabezarla decide cuánto más.
    const [membresias, jefaturas] = req.user!.memberId
      ? await Promise.all([
          prisma.areaMembership.findMany({
            where: { memberId: req.user!.memberId, activo: true },
            select: { areaId: true },
          }),
          prisma.jefatura.findMany({
            where: { memberId: req.user!.memberId, ...enFunciones() },
            select: { areaId: true },
          }),
        ])
      : [[], []];

    const misAreas = membresias.map((m) => m.areaId);
    const encabeza = jefaturas.length > 0;
    // Quien programa cursos necesita ver los de todos para no encimarse.
    const vePlaneacion = esAdmin || encabeza || req.user!.role === 'JEFE_CIM';

    const enRango = { fechaInicio: { lte: hasta }, OR: [{ fechaFin: { gte: desde } }, { fechaFin: null, fechaInicio: { gte: desde } }] };

    // --- Sesiones de cursos: son las que no deben chocar entre sí ---
    const sesiones = await prisma.editionActivity.findMany({
      where: enRango,
      include: {
        area: { select: { id: true, nombre: true, slug: true, color: true } },
        edition: { include: { course: { include: { area: { select: { id: true, nombre: true, slug: true, color: true } } } } } },
      },
      orderBy: { fechaInicio: 'asc' },
    });

    const entradas: Entrada[] = [];

    for (const s of sesiones) {
      // El área de la sesión, o si no la del curso al que pertenece.
      const area = s.area ?? s.edition.course.area ?? null;
      const propia = !area || misAreas.includes(area.id);

      if (!esAdmin && !propia && !vePlaneacion) continue;

      entradas.push({
        id: `sesion-${s.id}`,
        tipo: 'SESION',
        titulo: s.titulo,
        detalle: `${s.edition.clave} · ${s.edition.course.nombre}`,
        inicio: s.fechaInicio.toISOString(),
        fin: finDe(s.fechaInicio, s.fechaFin),
        lugar: s.lugar,
        area,
        ruta: `/panel/ediciones/${s.editionId}`,
        ajeno: !propia && !esAdmin,
      });
    }

    // --- Duración completa de cada edición abierta, como telón de fondo ---
    const ediciones = await prisma.courseEdition.findMany({
      where: {
        estado: { in: ['INSCRIPCIONES_ABIERTAS', 'EN_CURSO'] },
        fechaInicio: { lte: hasta },
        fechaFin: { gte: desde },
      },
      include: { course: { include: { area: { select: { id: true, nombre: true, slug: true, color: true } } } } },
    });

    for (const e of ediciones) {
      const area = e.course.area ?? null;
      const propia = !area || misAreas.includes(area.id);
      if (!esAdmin && !propia && !vePlaneacion) continue;

      entradas.push({
        id: `edicion-${e.id}`,
        tipo: 'EDICION',
        titulo: e.clave,
        detalle: e.course.nombre,
        inicio: e.fechaInicio.toISOString(),
        fin: e.fechaFin.toISOString(),
        lugar: e.sede,
        area,
        ruta: `/panel/ediciones/${e.id}`,
        ajeno: !propia && !esAdmin,
      });
    }

    // --- Eventos: aquí sí manda la visibilidad de cada uno ---
    const eventos = await prisma.event.findMany({
      where: {
        fechaInicio: { lte: hasta },
        OR: [{ fechaFin: { gte: desde } }, { fechaFin: null, fechaInicio: { gte: desde } }],
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
      },
      include: { area: { select: { id: true, nombre: true, slug: true, color: true } } },
    });

    for (const ev of eventos) {
      entradas.push({
        id: `evento-${ev.id}`,
        tipo: 'EVENTO',
        titulo: ev.titulo,
        detalle: ev.area?.nombre ?? 'Toda la asociación',
        inicio: ev.fechaInicio.toISOString(),
        fin: finDe(ev.fechaInicio, ev.fechaFin),
        lugar: ev.lugar ?? ev.urlVideoconferencia,
        area: ev.area,
        ruta: '/panel/eventos',
        ajeno: false,
      });
    }

    entradas.sort((a, b) => a.inicio.localeCompare(b.inicio));

    res.json({
      entradas,
      // El cliente usa esto para explicar por qué ve bloques de otras áreas.
      vePlaneacion,
      misAreas,
    });
  }),
);
