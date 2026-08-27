import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { forbidden, notFound } from '../lib/errors.js';
import { validate } from '../middleware/validate.js';
import { requireCargoDeArea, requireAuth, requireRole } from '../middleware/auth.js';
import { CARGOS_DE_MESA, areasConCargo } from '../lib/jefaturas.js';

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
  validate(z.object({ queEncabezo: z.enum(['true', 'false']).optional() }), 'query'),
  asyncHandler(async (req, res) => {
    // El catálogo de áreas es público; acotarlo es para las pantallas donde
    // solo tiene sentido lo propio, como el historial de jefaturas.
    const soloMias = (req.query as { queEncabezo?: string }).queEncabezo === 'true';
    const mias = soloMias ? await areasQueAdministra(req.user!) : null;

    const areas = await prisma.area.findMany({
      where: mias === null ? {} : { id: { in: mias } },
      orderBy: { orden: 'asc' },
      include: {
        _count: { select: { miembros: { where: { activo: true } }, cursos: true } },
      },
    });
    res.json(areas);
  }),
);

/**
 * Áreas donde esta persona manda. `null` = sin límite (mesa directiva).
 *
 * El historial de jefaturas trae teléfono y boleta de cada quien, así que no
 * puede ser de libre lectura entre áreas: es la misma regla que ya rige el
 * padrón y las declaraciones.
 */
async function areasQueAdministra(user: { role: string; memberId: string | null }) {
  if (user.role === 'ADMIN' || user.role === 'STAFF') return null;
  return areasConCargo(user.memberId, CARGOS_DE_MESA);
}

/** Datos de la persona que se muestran junto a un cargo. */
const FICHA_DE_MIEMBRO = {
  id: true, nombre: true, apellidoPaterno: true, apellidoMaterno: true,
  email: true, telefono: true, boleta: true, status: true, fotoUrl: true,
} as const;

/**
 * GET /api/areas/:areaId — la mesa del area, su padron y el historial de mando.
 *
 * El historial es lo que convierte "quien manda hoy" en "quien ha mandado":
 * cada periodo con sus fechas, quien lo nombro y por que termino.
 */
areasRouter.get(
  '/:areaId',
  asyncHandler(async (req, res) => {
    const ahora = new Date();

    const [area, jefaturas] = await Promise.all([
      prisma.area.findUnique({
        where: { id: req.params.areaId },
        include: {
          miembros: {
            where: { activo: true },
            include: { member: { select: FICHA_DE_MIEMBRO } },
            orderBy: { desde: 'asc' },
          },
          cursos: { include: { _count: { select: { ediciones: true } } } },
        },
      }),
      prisma.jefatura.findMany({
        where: { areaId: req.params.areaId },
        include: { member: { select: FICHA_DE_MIEMBRO } },
        orderBy: [{ desde: 'desc' }],
      }),
    ]);

    if (!area) throw notFound('Area no encontrada');

    const enFunciones = (j: (typeof jefaturas)[number]) => j.hasta === null || j.hasta >= ahora;
    const manda = (j: (typeof jefaturas)[number]) =>
      j.cargo === 'JEFE_DE_AREA' || j.cargo === 'JEFE_INTERINO';

    res.json({
      ...area,
      // En plural a proposito: hay co-jefaturas, y un interino puede convivir
      // con un titular. Devolver solo el primero los escondia.
      jefes: jefaturas.filter((j) => manda(j) && enFunciones(j)),
      tesoreros: jefaturas.filter((j) => j.cargo === 'TESORERO' && enFunciones(j)),
      /// Todo lo que ya termino, del mas reciente al mas viejo.
      historialDeJefaturas: jefaturas.filter((j) => !enFunciones(j)),
    });
  }),
);

/**
 * GET /api/areas/:areaId/historial — quien ha encabezado el area y que impartio.
 *
 * Junta las dos mitades de la pregunta "quien fue jefe y que hizo": el periodo
 * con sus fechas, y las ediciones que corrieron mientras lo tuvo. Se cruzan
 * por fecha, no por una lista aparte, para que no haya dos verdades.
 */
areasRouter.get(
  '/:areaId/historial',
  asyncHandler(async (req, res) => {
    const mias = await areasQueAdministra(req.user!);
    if (mias !== null && !mias.includes(req.params.areaId)) {
      throw forbidden('Solo puedes consultar el historial de tu area');
    }

    const [jefaturas, ediciones] = await Promise.all([
      prisma.jefatura.findMany({
        where: { areaId: req.params.areaId },
        include: { member: { select: FICHA_DE_MIEMBRO } },
        orderBy: [{ desde: 'desc' }],
      }),
      prisma.courseEdition.findMany({
        where: { course: { areaId: req.params.areaId } },
        select: {
          id: true, clave: true, estado: true, fechaInicio: true, fechaFin: true,
          course: { select: { nombre: true, codigo: true, kind: true } },
          instructores: { select: { id: true, nombre: true, apellidoPaterno: true } },
          _count: { select: { inscripciones: true } },
        },
        orderBy: { fechaInicio: 'desc' },
      }),
    ]);

    const ahora = new Date();

    res.json({
      periodos: jefaturas.map((j) => {
        // Un periodo abierto no termina hoy: termina cuando alguien lo cierre.
        // Cortarlo en "ahora" escondia las ediciones que el jefe en funciones
        // ya dejo programadas, que son justo las que esta armando.
        const fin = j.hasta;
        // Una edicion cuenta como suya si arranco durante su periodo. Se toma
        // el arranque y no el cierre porque quien la abre es quien la arma.
        const suyas = ediciones.filter(
          (e) => e.fechaInicio >= j.desde && (fin === null || e.fechaInicio <= fin),
        );
        return {
          ...j,
          enFunciones: j.hasta === null || j.hasta >= ahora,
          ediciones: suyas.map((e) => ({
            ...e,
            // Impartir es otra cosa que estar en el cargo: puede no coincidir.
            impartioEl: e.instructores.some((i) => i.id === j.memberId),
          })),
        };
      }),
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
  requireCargoDeArea(['JEFE_DE_AREA']),
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
