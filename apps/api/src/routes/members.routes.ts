import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { forbidden, notFound } from '../lib/errors.js';
import { validate } from '../middleware/validate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

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
  tipoSangre: z.string().max(5).optional().nullable(),
  alergias: z.string().optional().nullable(),
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
  const m = await prisma.areaMembership.findMany({
    where: {
      memberId: user.memberId,
      activo: true,
      role: { in: ['JEFE_DE_AREA', 'TESORERO'] },
    },
    select: { areaId: true },
  });
  return m.map((x) => x.areaId);
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
        areas: { include: { area: true }, orderBy: { desde: 'asc' } },
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

/** POST /api/members/:id/areas — asignar o mover a un miembro dentro de un area. */
const assignAreaSchema = z.object({
  areaId: z.string().min(1),
  role: z.enum(['JEFE_DE_AREA', 'TESORERO', 'MIEMBRO']).default('MIEMBRO'),
});

membersRouter.post(
  '/:id/areas',
  requireRole('ADMIN', 'STAFF'),
  validate(assignAreaSchema),
  asyncHandler(async (req, res) => {
    const { areaId, role } = req.body as z.infer<typeof assignAreaSchema>;

    const membership = await prisma.areaMembership.upsert({
      where: { memberId_areaId: { memberId: req.params.id, areaId } },
      create: { memberId: req.params.id, areaId, role },
      update: { role, activo: true, hasta: null },
      include: { area: true },
    });

    res.json(membership);
  }),
);

membersRouter.delete(
  '/:id/areas/:areaId',
  requireRole('ADMIN', 'STAFF'),
  asyncHandler(async (req, res) => {
    await prisma.areaMembership.update({
      where: { memberId_areaId: { memberId: req.params.id, areaId: req.params.areaId } },
      data: { activo: false, hasta: new Date() },
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
