import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { badRequest, forbidden, notFound } from '../lib/errors.js';
import { validate } from '../middleware/validate.js';
import {
  LARGO_MAXIMO_ALERGIA,
  MAXIMO_ALERGIAS,
  TIPOS_DE_SANGRE,
  normalizarAlergias,
} from '../lib/catalogos.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  MESES_MAXIMOS_INTERINO,
  CARGOS_DE_MESA,
  areasConCargo,
  limiteInterino,
  tieneCursoDelArea,
  cerrarJefaturas,
} from '../lib/jefaturas.js';

export const membersRouter = Router();
membersRouter.use(requireAuth);

const memberBase = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  apellidoPaterno: z.string().min(1, 'El apellido paterno es obligatorio'),
  apellidoMaterno: z.string().optional().nullable(),
  email: z.string().email('Correo invalido'),
  telefono: z.string().optional().nullable(),
  fechaNacimiento: z.coerce.date().optional().nullable(),
  boleta: z.string().optional().nullable(),
  escuela: z.string().optional().nullable(),
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
  contactoEmergencia: z.string().optional().nullable(),
  telefonoEmergencia: z.string().optional().nullable(),
  numeroSeguroSocial: z.string().optional().nullable(),
  status: z.enum(['ASPIRANTE', 'ACTIVO', 'INACTIVO', 'BAJA']).optional(),
  fotoUrl: z.string().url().optional().nullable(),
  notas: z.string().optional().nullable(),
});

const listQuery = z.object({
  q: z.string().trim().optional(),
  status: z.enum(['ASPIRANTE', 'ACTIVO', 'INACTIVO', 'BAJA']).optional(),
  areaId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(25),
});

/**
 * Areas cuyo padron puede consultar esta persona.
 * `null` = todas (mesa directiva). Lista vacia = ninguna.
 */
async function padronesQueVe(user: { role: string; memberId: string | null }) {
  if (user.role === 'ADMIN' || user.role === 'STAFF') return null;
  if (!user.memberId) return [];

  // Un jefe o tesorero ve a la gente de su area; nadie mas ve el padron.
  return areasConCargo(user.memberId, CARGOS_DE_MESA);
}

/**
 * GET /api/members — listado con busqueda, filtros y paginacion.
 *
 * El padron trae correos, telefonos y datos de emergencia, asi que no se
 * expone a cualquiera con sesion: la mesa directiva lo ve completo y un jefe
 * o tesorero solo el de sus areas. Un miembro consulta su propia ficha en
 * /api/perfil.
 */
membersRouter.get(
  '/',
  validate(listQuery, 'query'),
  asyncHandler(async (req, res) => {
    const { q, status, areaId, page, perPage } = req.query as unknown as z.infer<typeof listQuery>;

    const visibles = await padronesQueVe(req.user!);
    if (visibles !== null && visibles.length === 0) {
      throw forbidden('El padron solo lo consultan la mesa directiva y los jefes de area');
    }
    // Un jefe que filtra por un area ajena no debe ver nada de ella.
    if (visibles !== null && areaId && !visibles.includes(areaId)) {
      throw forbidden('Ese padron no es de tus areas');
    }

    const where = {
      ...(visibles === null ? {} : { areas: { some: { areaId: { in: visibles }, activo: true } } }),
      ...(status ? { status } : {}),
      ...(areaId ? { areas: { some: { areaId, activo: true } } } : {}),
      ...(q
        ? {
            OR: [
              { nombre: { contains: q, mode: 'insensitive' as const } },
              { apellidoPaterno: { contains: q, mode: 'insensitive' as const } },
              { apellidoMaterno: { contains: q, mode: 'insensitive' as const } },
              { email: { contains: q, mode: 'insensitive' as const } },
              { boleta: { contains: q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [total, data] = await Promise.all([
      prisma.member.count({ where }),
      prisma.member.findMany({
        where,
        include: {
          areas: { where: { activo: true }, include: { area: { select: { id: true, nombre: true, slug: true, color: true } } } },
          // Solo los cargos en funciones: en la lista interesa quien manda hoy.
          jefaturas: {
            where: { OR: [{ hasta: null }, { hasta: { gte: new Date() } }] },
            select: { id: true, cargo: true, areaId: true, desde: true },
          },
          _count: { select: { enrollments: true } },
        },
        orderBy: [{ apellidoPaterno: 'asc' }, { nombre: 'asc' }],
        skip: (page - 1) * perPage,
        take: perPage,
      }),
    ]);

    res.json({ data, meta: { total, page, perPage, totalPages: Math.ceil(total / perPage) } });
  }),
);

/** GET /api/members/:id — ficha completa, con areas y su historial de cursos. */
membersRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    // Un miembro sin rol administrativo solo puede ver su propia ficha.
    if (req.user!.role === 'MIEMBRO' && req.user!.memberId !== req.params.id) {
      throw forbidden();
    }

    const member = await prisma.member.findUnique({
      where: { id: req.params.id },
      include: {
        areas: { where: { activo: true }, include: { area: true }, orderBy: { desde: 'asc' } },
        // Todas, incluidas las cerradas: el paso de alguien por un cargo es
        // parte de su ficha, no solo lo que ocupa hoy.
        jefaturas: { include: { area: true }, orderBy: { desde: 'desc' } },
        edicionesImpartidas: {
          select: {
            id: true, clave: true, fechaInicio: true, fechaFin: true, estado: true,
            course: { select: { nombre: true, codigo: true, areaId: true } },
          },
          orderBy: { fechaInicio: 'desc' },
        },
        user: { select: { id: true, email: true, role: true, activo: true, ultimoAcceso: true } },
        enrollments: {
          include: { edition: { include: { course: true } } },
          orderBy: { fechaInscripcion: 'desc' },
        },
      },
    });

    if (!member) throw notFound('Miembro no encontrado');
    res.json(member);
  }),
);

membersRouter.post(
  '/',
  requireRole('ADMIN', 'STAFF'),
  validate(memberBase),
  asyncHandler(async (req, res) => {
    const data = req.body as z.infer<typeof memberBase>;
    const member = await prisma.member.create({
      data: { ...data, email: data.email.toLowerCase() },
    });
    res.status(201).json(member);
  }),
);

membersRouter.patch(
  '/:id',
  requireRole('ADMIN', 'STAFF'),
  validate(memberBase.partial()),
  asyncHandler(async (req, res) => {
    const data = req.body as Partial<z.infer<typeof memberBase>>;
    const member = await prisma.member.update({
      where: { id: req.params.id },
      data: { ...data, ...(data.email ? { email: data.email.toLowerCase() } : {}) },
    });
    res.json(member);
  }),
);

/** Baja logica: conserva el historial de cursos en lugar de borrarlo. */
membersRouter.delete(
  '/:id',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const member = await prisma.member.update({
      where: { id: req.params.id },
      data: { status: 'BAJA', fechaBaja: new Date() },
    });
    await prisma.user.updateMany({ where: { memberId: member.id }, data: { activo: false } });
    res.json({ ok: true, member });
  }),
);

/**
 * POST /api/members/:id/areas — integrar a alguien al area, con cargo o sin él.
 *
 * `MIEMBRO` no es un cargo: significa "solo pertenece". Se acepta aquí porque
 * es lo mismo que pedir la pertenencia sin mesa, y separarlo en otra ruta
 * obligaría a la interfaz a saber cuál llamar antes de que el usuario elija.
 */
const assignAreaSchema = z.object({
  areaId: z.string().min(1),
  role: z.enum(['JEFE_DE_AREA', 'JEFE_INTERINO', 'TESORERO', 'MIEMBRO']).default('MIEMBRO'),
  /// Obligatoria para un interino; opcional para los demas.
  hasta: z.coerce.date().optional().nullable(),
  motivo: z.string().max(400).optional().nullable(),
});

/**
 * POST /api/members/:id/areas — dar un cargo a un miembro del area.
 *
 * El cargo cuelga de una **persona real** del padron, con su telefono y su
 * expediente: no existe una "cuenta de jefe" flotando. Por eso lo primero que
 * hace es asegurarse de que pertenezca al area.
 *
 * Jefe titular exige tener aprobado el curso base de esa area: el cargo
 * aprueba cursos ajenos, y no tendria sentido que lo ejerza quien no acredito
 * el suyo. Cuando nadie califica, la salida es un JEFE_INTERINO, que siempre
 * lleva fecha de termino y caduca solo.
 *
 * Cada alta abre un **periodo nuevo** y cierra el que la persona tuviera en
 * esa area. Asi queda historia en lugar de una foto del presente.
 */
membersRouter.post(
  '/:id/areas',
  requireRole('ADMIN', 'STAFF'),
  validate(assignAreaSchema),
  asyncHandler(async (req, res) => {
    const { areaId, role, hasta, motivo } = req.body as z.infer<typeof assignAreaSchema>;

    if (role === 'JEFE_DE_AREA' && !(await tieneCursoDelArea(req.params.id, areaId))) {
      throw badRequest(
        'Para ser jefe titular hace falta tener aprobado un curso de esa area. ' +
          'Si nadie califica todavia, nombra a un jefe interino.',
      );
    }

    // El interino existe justamente para no quedarse; el plazo no es opcional.
    let termino = hasta ?? null;
    if (role === 'JEFE_INTERINO') {
      const maximo = limiteInterino();
      termino = hasta ?? maximo;
      if (termino > maximo) {
        throw badRequest(
          `Un interino no puede pasar de ${MESES_MAXIMOS_INTERINO} meses. ` +
            `La fecha maxima es ${maximo.toLocaleDateString('es-MX')}.`,
        );
      }
      if (termino <= new Date()) throw badRequest('La fecha de termino ya paso');
    }

    const ahora = new Date();

    const jefatura = await prisma.$transaction(async (tx) => {
      // El cargo cuelga de la pertenencia: si no es del area, primero lo es.
      await tx.areaMembership.upsert({
        where: { memberId_areaId: { memberId: req.params.id, areaId } },
        create: {
          memberId: req.params.id,
          areaId,
          asignadoPor: req.user!.email,
          motivo: motivo ?? 'Integrado al asignarle un cargo',
        },
        update: { activo: true },
      });

      // Cambiar de cargo es terminar uno y empezar otro, no editar el mismo.
      await cerrarJefaturas(tx, {
        memberId: req.params.id,
        areaId,
        relevadoPor: req.user!.email,
        motivo: role === 'MIEMBRO' ? 'Pasa a miembro sin cargo' : 'Cambio de cargo',
        cuando: ahora,
      });

      // Sin cargo no hay periodo que abrir: queda solo la pertenencia.
      if (role === 'MIEMBRO') {
        const m = await tx.areaMembership.findUnique({
          where: { memberId_areaId: { memberId: req.params.id, areaId } },
          include: { area: true },
        });
        return { ...m, cargo: null };
      }

      return tx.jefatura.create({
        data: {
          memberId: req.params.id,
          areaId,
          cargo: role,
          desde: ahora,
          hasta: termino,
          asignadoPor: req.user!.email,
          motivo: motivo ?? null,
        },
        include: { area: true, member: { select: { nombre: true, apellidoPaterno: true } } },
      });
    });

    res.json(jefatura);
  }),
);

/**
 * POST /api/members/:id/areas/:areaId/relevar
 * Cierra el cargo y deja a la persona como miembro del area: el jefe saliente
 * rara vez abandona la disciplina, solo deja de mandar.
 *
 * No borra el periodo: le pone fecha de termino. Eso es lo que hace que el
 * historial exista.
 */
const relevarSchema = z.object({ motivo: z.string().max(300).optional().nullable() });

membersRouter.post(
  '/:id/areas/:areaId/relevar',
  requireRole('ADMIN', 'STAFF'),
  validate(relevarSchema),
  asyncHandler(async (req, res) => {
    const { motivo } = req.body as z.infer<typeof relevarSchema>;

    const cerradas = await cerrarJefaturas(prisma, {
      memberId: req.params.id,
      areaId: req.params.areaId,
      relevadoPor: req.user!.email,
      motivo: motivo ?? 'Relevado del cargo',
    });

    if (cerradas.count === 0) throw notFound('Esa persona no tiene un cargo en funciones en el area');

    res.json({ ok: true, cerradas: cerradas.count });
  }),
);

/**
 * GET /api/members/:id/areas/:areaId/elegible
 * Si esta persona califica para jefe titular de esa area.
 */
membersRouter.get(
  '/:id/areas/:areaId/elegible',
  asyncHandler(async (req, res) => {
    res.json({ elegible: await tieneCursoDelArea(req.params.id, req.params.areaId) });
  }),
);

membersRouter.delete(
  '/:id/areas/:areaId',
  requireRole('ADMIN', 'STAFF'),
  asyncHandler(async (req, res) => {
    // Sacar a alguien del area sin cerrarle el cargo lo dejaria mandando
    // en un area a la que ya no pertenece.
    await prisma.$transaction(async (tx) => {
      await cerrarJefaturas(tx, {
        memberId: req.params.id,
        areaId: req.params.areaId,
        relevadoPor: req.user!.email,
        motivo: 'Dado de baja del area',
      });
      await tx.areaMembership.update({
        where: { memberId_areaId: { memberId: req.params.id, areaId: req.params.areaId } },
        data: { activo: false },
      });
    });
    res.json({ ok: true });
  }),
);

/** POST /api/members/:id/user — darle acceso al panel a un miembro. */
const createUserSchema = z.object({
  password: z.string().min(8, 'La contrasena debe tener al menos 8 caracteres'),
  role: z.enum(['ADMIN', 'STAFF', 'MIEMBRO']).default('MIEMBRO'),
});

membersRouter.post(
  '/:id/user',
  requireRole('ADMIN'),
  validate(createUserSchema),
  asyncHandler(async (req, res) => {
    const { password, role } = req.body as z.infer<typeof createUserSchema>;

    const member = await prisma.member.findUnique({ where: { id: req.params.id } });
    if (!member) throw notFound('Miembro no encontrado');

    const user = await prisma.user.upsert({
      where: { memberId: member.id },
      create: {
        email: member.email,
        passwordHash: await bcrypt.hash(password, 12),
        role,
        memberId: member.id,
        // La crea un administrador que ya conoce a la persona y le entrega la
        // contrasena en mano: no hay correo que confirmar. Sin esto, la cuenta
        // nacería sin poder iniciar sesion.
        emailVerificadoEn: new Date(),
      },
      update: {
        passwordHash: await bcrypt.hash(password, 12),
        role,
        activo: true,
        emailVerificadoEn: new Date(),
      },
      select: { id: true, email: true, role: true, activo: true },
    });

    res.status(201).json(user);
  }),
);
