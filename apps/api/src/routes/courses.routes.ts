import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { badRequest, forbidden, notFound } from '../lib/errors.js';
import { validate } from '../middleware/validate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { siguienteClave, sugerirCodigo } from '../lib/claves.js';
import { ROLES_DE_MANDO, areasConRol } from '../lib/jefaturas.js';
import { revisarRequisitos } from '../lib/requisitos.js';

const esMesa = (rol?: string) => rol === 'ADMIN' || rol === 'STAFF';

/**
 * Áreas cuyo catálogo puede tocar quien hace la petición.
 * La mesa directiva no tiene límite; un jefe manda en las suyas y nada más.
 */
async function areasQueAdministra(req: { user?: { role: string; memberId: string | null } }) {
  if (esMesa(req.user?.role)) return null; // null = sin restricción
  return areasConRol(req.user?.memberId ?? null, ROLES_DE_MANDO);
}

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
  validate(
    z.object({
      kind: z.enum(['CIM', 'AREA', 'TALLER', 'CERTIFICACION']).optional(),
      areaId: z.string().optional(),
      /// La vista de gestión lo enciende; el expediente NO, porque ahí un
      /// miembro declara cursos de cualquier área y necesita el catálogo entero.
      soloMisAreas: z.enum(['true', 'false']).optional(),
    }),
    'query',
  ),
  asyncHandler(async (req, res) => {
    const { kind, areaId, soloMisAreas } = req.query as {
      kind?: never;
      areaId?: string;
      soloMisAreas?: string;
    };

    const mias = await areasQueAdministra(req);
    const acotar = soloMisAreas === 'true' && mias !== null;

    const courses = await prisma.course.findMany({
      where: {
        ...(kind ? { kind } : {}),
        ...(areaId ? { areaId } : {}),
        ...(acotar ? { areaId: { in: mias } } : {}),
      },
      include: {
        area: { select: { id: true, nombre: true, slug: true, color: true } },
        ediciones: { orderBy: { fechaInicio: 'desc' }, take: 3 },
        requiere: { select: { id: true, nombre: true, codigo: true } },
        _count: { select: { ediciones: true } },
      },
      orderBy: { nombre: 'asc' },
    });

    // Quién puede editar cada fila lo decide el servidor: la interfaz solo
    // pinta lo que le dicen, y así no hay dos versiones de la misma regla.
    res.json(
      courses.map((c) => ({
        ...c,
        puedeEditar: mias === null || (c.areaId !== null && mias.includes(c.areaId)),
      })),
    );
  }),
);

coursesRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const course = await prisma.course.findUnique({
      where: { id: req.params.id },
      include: {
        area: true,
        requiere: { select: { id: true, nombre: true, codigo: true, kind: true } },
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
  validate(courseSchema),
  asyncHandler(async (req, res) => {
    const data = req.body as z.infer<typeof courseSchema>;

    const mias = await areasQueAdministra(req);
    if (mias !== null) {
      if (!data.areaId || !mias.includes(data.areaId)) {
        throw forbidden('Solo puedes dar de alta cursos de tu area');
      }
      // El curso base define quién es miembro del área: crearlo cambia una
      // regla de la asociación, no un detalle del área. Eso lo ve la mesa.
      if (data.kind !== 'TALLER' && data.kind !== 'CERTIFICACION') {
        throw forbidden('El curso base y el CIM los da de alta la mesa directiva');
      }
    }
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
  validate(courseSchema.partial()),
  asyncHandler(async (req, res) => {
    const cambios = req.body as Partial<z.infer<typeof courseSchema>>;

    const mias = await areasQueAdministra(req);
    if (mias !== null) {
      const actual = await prisma.course.findUnique({
        where: { id: req.params.id },
        select: { areaId: true, kind: true },
      });
      if (!actual) throw notFound('Curso no encontrado');
      if (!actual.areaId || !mias.includes(actual.areaId)) {
        throw forbidden('Solo puedes editar cursos de tu area');
      }
      // Mover el curso de área lo sacaría de su alcance, o metería el de otro
      // en él. Cambiar el tipo altera quién obtiene membresía. Ninguna es suya.
      if (cambios.areaId !== undefined && cambios.areaId !== actual.areaId) {
        throw forbidden('Cambiar un curso de area corresponde a la mesa directiva');
      }
      if (cambios.kind !== undefined && cambios.kind !== actual.kind) {
        throw forbidden('Cambiar el tipo de curso corresponde a la mesa directiva');
      }
    }

    res.json(await prisma.course.update({ where: { id: req.params.id }, data: cambios }));
  }),
);

/**
 * PUT /api/courses/:id/requisitos — qué hay que traer acreditado para entrar.
 *
 * Solo la mesa directiva: un requisito ata dos áreas (alta montaña depende de
 * media montaña y del CIM), así que ningún jefe puede fijarlo por su cuenta.
 */
coursesRouter.put(
  '/:id/requisitos',
  requireRole('ADMIN', 'STAFF'),
  validate(z.object({ requiereIds: z.array(z.string()).max(6) })),
  asyncHandler(async (req, res) => {
    const { requiereIds } = req.body as { requiereIds: string[] };
    if (requiereIds.includes(req.params.id)) throw badRequest('Un curso no puede requerirse a si mismo');

    // Un ciclo (A pide B, B pide A) dejaría el curso imposible de tomar.
    const encadenados = await prisma.course.findMany({
      where: { id: { in: requiereIds }, requiere: { some: { id: req.params.id } } },
      select: { nombre: true },
    });
    if (encadenados.length) {
      throw badRequest(`Quedaria un requisito circular con ${encadenados.map((c) => c.nombre).join(', ')}`);
    }

    res.json(
      await prisma.course.update({
        where: { id: req.params.id },
        data: { requiere: { set: requiereIds.map((id) => ({ id })) } },
        include: { requiere: { select: { id: true, nombre: true, codigo: true } } },
      }),
    );
  }),
);

/** GET /api/courses/:id/requisitos/:memberId — si esa persona ya los cubre. */
coursesRouter.get(
  '/:id/requisitos/:memberId',
  asyncHandler(async (req, res) => {
    res.json(await revisarRequisitos(req.params.memberId, req.params.id));
  }),
);

coursesRouter.delete(
  '/:id',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    res.json(await prisma.course.update({ where: { id: req.params.id }, data: { activo: false } }));
  }),
);
