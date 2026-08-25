import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { badRequest, conflict, notFound } from '../lib/errors.js';
import { validate } from '../middleware/validate.js';
import {
  LARGO_MAXIMO_ALERGIA,
  MAXIMO_ALERGIAS,
  TIPOS_DE_SANGRE,
  normalizarAlergias,
} from '../lib/catalogos.js';
import { requireAuth } from '../middleware/auth.js';
import { vigente } from '../lib/jefaturas.js';

export const perfilRouter = Router();
perfilRouter.use(requireAuth);

const ANIO_MINIMO = 1980;
const LETRAS = ['A', 'B', 'C', 'D', 'E'] as const;

/** GET /api/perfil — la ficha propia con sus áreas y cursos declarados. */
perfilRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    if (!req.user!.memberId) throw notFound('Tu cuenta no tiene ficha de miembro');

    const member = await prisma.member.findUnique({
      where: { id: req.user!.memberId },
      include: {
        areas: { where: { activo: true }, include: { area: true } },
        cursosDeclarados: {
          include: {
            course: {
              include: { area: { select: { id: true, nombre: true, slug: true, color: true } } },
            },
          },
          orderBy: [{ anio: 'desc' }, { createdAt: 'desc' }],
        },
      },
    });
    if (!member) throw notFound('Miembro no encontrado');

    // Datos que la logística de salidas necesita antes de dejar salir a nadie.
    const faltantes = [
      !member.numeroSeguroSocial && 'numeroSeguroSocial',
      !member.contactoEmergencia && 'contactoEmergencia',
      !member.telefonoEmergencia && 'telefonoEmergencia',
    ].filter((x): x is string => Boolean(x));

    res.json({ ...member, perfilCompleto: faltantes.length === 0, faltantes });
  }),
);

const perfilSchema = z.object({
  telefono: z.string().optional().nullable(),
  fechaNacimiento: z.coerce.date().optional().nullable(),
  boleta: z.string().optional().nullable(),
  escuela: z.string().optional().nullable(),
  numeroSeguroSocial: z.string().min(1, 'El NSS es obligatorio'),
  contactoEmergencia: z.string().min(1, 'El contacto de emergencia es obligatorio'),
  telefonoEmergencia: z.string().min(1, 'El telefono de emergencia es obligatorio'),
  direccion: z.string().optional().nullable(),
  lesiones: z.string().max(2000).optional().nullable(),
  tipoSangre: z
    .enum(TIPOS_DE_SANGRE, {
      errorMap: () => ({ message: `Elige uno de: ${TIPOS_DE_SANGRE.join(', ')}` }),
    })
    .nullable()
    .optional()
    .or(z.literal('').transform(() => null)),
  alergias: z
    .array(z.string())
    // Se limpia antes de medir: un vacío o una repetida no deben tumbar el
    // guardado entero, solo desaparecer de la lista.
    .transform(normalizarAlergias)
    .refine((v) => v.length <= MAXIMO_ALERGIAS, {
      message: `No más de ${MAXIMO_ALERGIAS} alergias`,
    })
    .refine((v) => v.every((x) => x.length <= LARGO_MAXIMO_ALERGIA), {
      message: `Cada alergia admite hasta ${LARGO_MAXIMO_ALERGIA} caracteres`,
    })
    .optional(),
  padecimientos: z.string().optional().nullable(),
});

/** PATCH /api/perfil — completar los datos propios. */
perfilRouter.patch(
  '/',
  validate(perfilSchema.partial()),
  asyncHandler(async (req, res) => {
    if (!req.user!.memberId) throw notFound('Tu cuenta no tiene ficha de miembro');

    res.json(
      await prisma.member.update({
        where: { id: req.user!.memberId },
        data: req.body,
      }),
    );
  }),
);

const declaracionSchema = z.object({
  courseId: z.string().min(1, 'Elige el curso'),
  anio: z.coerce
    .number()
    .int()
    .min(ANIO_MINIMO, `El ano no puede ser anterior a ${ANIO_MINIMO}`)
    .max(new Date().getFullYear(), 'El ano no puede ser futuro'),
  letra: z.enum(LETRAS),
  notas: z.string().max(500).optional().nullable(),
});

/**
 * POST /api/perfil/cursos
 * El miembro declara un curso que tomó. Queda PENDIENTE hasta que el área
 * correspondiente lo confirme: nadie se acredita a sí mismo.
 */
perfilRouter.post(
  '/cursos',
  validate(declaracionSchema),
  asyncHandler(async (req, res) => {
    if (!req.user!.memberId) throw notFound('Tu cuenta no tiene ficha de miembro');
    const d = req.body as z.infer<typeof declaracionSchema>;

    const curso = await prisma.course.findUnique({ where: { id: d.courseId } });
    if (!curso) throw notFound('Curso no encontrado');

    const repetida = await prisma.courseClaim.findUnique({
      where: {
        memberId_courseId_anio_letra: {
          memberId: req.user!.memberId,
          courseId: d.courseId,
          anio: d.anio,
          letra: d.letra,
        },
      },
    });
    if (repetida) throw conflict('Ya declaraste ese curso, esa generacion.');

    res.status(201).json(
      await prisma.courseClaim.create({
        data: { ...d, memberId: req.user!.memberId },
        include: { course: { include: { area: true } } },
      }),
    );
  }),
);

/**
 * PATCH /api/perfil/cursos/:id
 *
 * Corregir la propia declaración solo mientras nadie la ha revisado. Una vez
 * aprobada, el dato ya sirvió para dar acceso: cambiarlo por cuenta propia
 * dejaría el expediente diciendo algo que el área nunca confirmó. Si hay que
 * arreglarla después, la corrige el área, que lleva el registro.
 */
perfilRouter.patch(
  '/cursos/:id',
  validate(declaracionSchema.partial()),
  asyncHandler(async (req, res) => {
    const claim = await prisma.courseClaim.findUnique({ where: { id: req.params.id } });
    if (!claim || claim.memberId !== req.user!.memberId) throw notFound('Declaracion no encontrada');
    if (claim.status !== 'PENDIENTE') {
      throw badRequest(
        'Esta declaracion ya fue revisada. Pide al area que la corrija: ellos llevan el registro.',
      );
    }

    const d = req.body as Partial<z.infer<typeof declaracionSchema>>;
    const courseId = d.courseId ?? claim.courseId;
    const anio = d.anio ?? claim.anio;
    const letra = d.letra ?? claim.letra;

    // La misma generacion del mismo curso no puede quedar declarada dos veces.
    const choque = await prisma.courseClaim.findFirst({
      where: {
        memberId: claim.memberId,
        courseId,
        anio,
        letra,
        NOT: { id: claim.id },
      },
    });
    if (choque) throw conflict('Ya tienes declarado ese curso, esa generacion.');

    res.json(
      await prisma.courseClaim.update({
        where: { id: claim.id },
        data: {
          courseId,
          anio,
          letra,
          notas: d.notas ?? claim.notas,
          editadaPor: req.user!.email,
          editadaEn: new Date(),
        },
        include: { course: { include: { area: true } } },
      }),
    );
  }),
);

/** DELETE /api/perfil/cursos/:id — retirar una declaración aún sin revisar. */
perfilRouter.delete(
  '/cursos/:id',
  asyncHandler(async (req, res) => {
    const claim = await prisma.courseClaim.findUnique({ where: { id: req.params.id } });
    if (!claim || claim.memberId !== req.user!.memberId) throw notFound('Declaracion no encontrada');
    if (claim.status !== 'PENDIENTE') {
      throw badRequest('Solo puedes retirar declaraciones que siguen pendientes');
    }

    await prisma.courseClaim.delete({ where: { id: claim.id } });
    res.json({ ok: true });
  }),
);

/** GET /api/perfil/areas-visibles — las areas que esta persona puede consultar. */
perfilRouter.get(
  '/areas-visibles',
  asyncHandler(async (req, res) => {
    if (req.user!.role === 'ADMIN' || req.user!.role === 'STAFF') {
      return res.json(await prisma.area.findMany({ where: { activa: true }, orderBy: { orden: 'asc' } }));
    }
    if (!req.user!.memberId) return res.json([]);

    const membresias = await prisma.areaMembership.findMany({
      where: { memberId: req.user!.memberId, ...vigente() },
      include: { area: true },
    });
    res.json(membresias.map((m) => m.area));
  }),
);

