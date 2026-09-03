import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { notFound } from '../lib/errors.js';
import { validate } from '../middleware/validate.js';

/** Rutas sin autenticacion: alimentan el sitio informativo y reciben solicitudes. */
export const publicRouter = Router();

/**
 * GET /api/public/eventos — proximos eventos abiertos al publico.
 * Solo los marcados PUBLICO y publicados; lo privado de area nunca sale de aqui.
 */
publicRouter.get(
  '/eventos',
  asyncHandler(async (req, res) => {
    const { areaId, limite } = req.query as Record<string, string | undefined>;

    res.json(
      await prisma.event.findMany({
        where: {
          publicado: true,
          visibilidad: 'PUBLICO',
          ...(areaId ? { areaId } : {}),
          OR: [{ fechaFin: { gte: new Date() } }, { fechaFin: null, fechaInicio: { gte: new Date() } }],
        },
        orderBy: { fechaInicio: 'asc' },
        take: limite ? Math.min(Number(limite) || 20, 50) : 20,
        select: {
          id: true, titulo: true, descripcion: true, kind: true,
          modalidad: true, lugar: true, urlVideoconferencia: true,
          fechaInicio: true, fechaFin: true, imagenUrl: true,
          cupo: true, registroUrl: true,
          area: { select: { nombre: true, slug: true, color: true } },
        },
      }),
    );
  }),
);

/** GET /api/public/areas — las disciplinas para la portada. */
publicRouter.get(
  '/areas',
  asyncHandler(async (_req, res) => {
    const areas = await prisma.area.findMany({
      where: { activa: true },
      orderBy: { orden: 'asc' },
      select: {
        id: true, slug: true, nombre: true, descripcion: true,
        imagenUrl: true, galeria: true, color: true,
        _count: { select: { miembros: { where: { activo: true } } } },
      },
    });
    res.json(areas);
  }),
);

/** GET /api/public/areas/:slug — ficha publica de un area, con su jefe visible. */
publicRouter.get(
  '/areas/:slug',
  asyncHandler(async (req, res) => {
    const area = await prisma.area.findUnique({
      where: { slug: req.params.slug },
      select: {
        id: true, slug: true, nombre: true, descripcion: true, contenido: true,
        imagenUrl: true, galeria: true, color: true,
        cursos: {
          where: { activo: true },
          select: { id: true, slug: true, nombre: true, descripcion: true, requisitos: true, duracionHoras: true },
        },
        // La mesa que se anuncia es la que está en funciones hoy.
        jefaturas: {
          where: { OR: [{ hasta: null }, { hasta: { gte: new Date() } }] },
          select: {
            cargo: true,
            member: { select: { nombre: true, apellidoPaterno: true, fotoUrl: true } },
          },
          orderBy: { cargo: 'asc' },
        },
      },
    });

    if (!area) throw notFound('Area no encontrada');
    res.json(area);
  }),
);

/** GET /api/public/cim — proximas convocatorias del curso introductorio. */
publicRouter.get(
  '/cim',
  asyncHandler(async (_req, res) => {
    const ediciones = await prisma.courseEdition.findMany({
      where: {
        course: { kind: 'CIM' },
        estado: { in: ['INSCRIPCIONES_ABIERTAS', 'EN_CURSO'] },
      },
      orderBy: { fechaInicio: 'asc' },
      select: {
        id: true, clave: true, fechaInicio: true, fechaFin: true,
        inscripcionesCierran: true, cupo: true, sede: true, estado: true,
        course: { select: { nombre: true, descripcion: true, requisitos: true } },
        actividades: {
          orderBy: { fechaInicio: 'asc' },
          select: {
            titulo: true, fechaInicio: true, lugar: true,
            area: { select: { nombre: true, slug: true, color: true } },
          },
        },
        _count: { select: { inscripciones: true } },
      },
    });

    res.json(
      ediciones.map(({ _count, ...e }) => ({
        ...e,
        lugaresRestantes: e.cupo === null ? null : Math.max(0, e.cupo - _count.inscripciones),
      })),
    );
  }),
);

/** GET /api/public/cursos — catalogo publico de cursos. */
publicRouter.get(
  '/cursos',
  asyncHandler(async (_req, res) => {
    res.json(
      await prisma.course.findMany({
        where: { activo: true },
        orderBy: [{ kind: 'asc' }, { nombre: 'asc' }],
        select: {
          id: true, slug: true, nombre: true, kind: true, descripcion: true,
          requisitos: true, duracionHoras: true,
          area: { select: { nombre: true, slug: true, color: true } },
          ediciones: {
            where: { estado: 'INSCRIPCIONES_ABIERTAS' },
            orderBy: { fechaInicio: 'asc' },
            select: { id: true, clave: true, fechaInicio: true, fechaFin: true },
          },
        },
      }),
    );
  }),
);

/** GET /api/public/anuncios — carrusel de la portada, solo lo publicado. */
publicRouter.get(
  '/anuncios',
  asyncHandler(async (_req, res) => {
    res.json(
      await prisma.anuncio.findMany({
        where: { publicado: true },
        orderBy: [{ orden: 'asc' }, { createdAt: 'asc' }],
        select: {
          id: true, titulo: true, descripcion: true, imagenUrl: true,
          enlaceUrl: true, enlaceTexto: true,
        },
      }),
    );
  }),
);

/** GET /api/public/configuracion — redes sociales del pie del sitio. */
publicRouter.get(
  '/configuracion',
  asyncHandler(async (_req, res) => {
    const s = await prisma.siteSettings.findUnique({ where: { id: 'global' } });
    res.json({
      facebookUrl: s?.facebookUrl ?? null,
      instagramUrl: s?.instagramUrl ?? null,
      xUrl: s?.xUrl ?? null,
      youtubeUrl: s?.youtubeUrl ?? null,
      tiktokUrl: s?.tiktokUrl ?? null,
      whatsappUrl: s?.whatsappUrl ?? null,
      tema: s?.tema ?? 'clasico',
    });
  }),
);

/** Un formulario publico necesita freno: 5 envios por hora e IP. */
const solicitudLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Recibimos varias solicitudes desde este equipo. Intenta mas tarde.' },
});

const solicitudSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  apellidoPaterno: z.string().min(1, 'El apellido paterno es obligatorio'),
  apellidoMaterno: z.string().optional().nullable(),
  email: z.string().email('Correo invalido'),
  telefono: z.string().optional().nullable(),
  escuela: z.string().optional().nullable(),
  boleta: z.string().optional().nullable(),
  areasInteres: z.array(z.string()).default([]),
  experiencia: z.string().max(2000).optional().nullable(),
  mensaje: z.string().max(2000).optional().nullable(),
});

/** POST /api/public/solicitudes — formulario "Quiero unirme". */
publicRouter.post(
  '/solicitudes',
  solicitudLimiter,
  validate(solicitudSchema),
  asyncHandler(async (req, res) => {
    const data = req.body as z.infer<typeof solicitudSchema>;

    await prisma.membershipApplication.create({
      data: { ...data, email: data.email.toLowerCase() },
    });

    // Sin eco de datos: el formulario es publico.
    res.status(201).json({
      ok: true,
      mensaje: 'Recibimos tu solicitud. La mesa directiva te contactara por correo.',
    });
  }),
);

const contactoSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  email: z.string().email('Correo invalido'),
  telefono: z.string().optional().nullable(),
  /// Sin area: el mensaje es para la mesa directiva.
  areaId: z.string().optional().nullable(),
  mensaje: z.string().min(1, 'Escribe un mensaje').max(2000),
});

/**
 * POST /api/public/contacto — formulario "Contáctanos" del pie del sitio.
 *
 * Sin sesión ni eco de datos, igual que las solicitudes de ingreso: quien
 * escribe no necesita saber si su mensaje llegó a la mesa directiva o a un
 * área en particular, solo que se recibió.
 */
publicRouter.post(
  '/contacto',
  solicitudLimiter,
  validate(contactoSchema),
  asyncHandler(async (req, res) => {
    const data = req.body as z.infer<typeof contactoSchema>;
    await prisma.contactMessage.create({ data: { ...data, email: data.email.toLowerCase() } });
    res.status(201).json({ ok: true, mensaje: 'Recibimos tu mensaje. Te responderán pronto.' });
  }),
);
