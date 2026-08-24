import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

/** Un asunto que espera acción de alguien. */
interface Pendiente {
  tipo:
    | 'SOLICITUDES'
    | 'DECLARACIONES'
    | 'PAGOS'
    | 'EVENTOS_SIN_PUBLICAR'
    | 'EDICION_SIN_PROGRAMA';
  cantidad: number;
  titulo: string;
  detalle: string;
  ruta: string;
  /** Ordena la lista: lo más urgente primero. */
  prioridad: number;
}

/**
 * GET /api/notificaciones
 *
 * Devuelve solo lo que quien pregunta puede resolver: las solicitudes de
 * ingreso las revisa la mesa directiva, así que a un jefe de área no se le
 * anuncian. Una notificación que no se puede atender es solo ruido.
 */
/** Cuantas declaraciones de curso puede resolver esta persona. */
async function contarDeclaracionesQueRevisa(user: { role: string; memberId: string | null }) {
  const esAdmin = user.role === 'ADMIN' || user.role === 'STAFF';
  if (esAdmin) return prisma.courseClaim.count({ where: { status: 'PENDIENTE' } });

  const coordinaCim = user.role === 'JEFE_CIM';
  const areas = user.memberId
    ? (
        await prisma.areaMembership.findMany({
          where: { memberId: user.memberId, activo: true, role: 'JEFE_DE_AREA' },
          select: { areaId: true },
        })
      ).map((a) => a.areaId)
    : [];

  if (areas.length === 0 && !coordinaCim) return 0;

  return prisma.courseClaim.count({
    where: {
      status: 'PENDIENTE',
      OR: [
        ...(areas.length ? [{ course: { areaId: { in: areas } } }] : []),
        ...(coordinaCim ? [{ course: { areaId: null } }] : []),
      ],
    },
  });
}

notificationsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const esAdmin = req.user!.role === 'ADMIN' || req.user!.role === 'STAFF';
    const pendientes: Pendiente[] = [];

    if (esAdmin) {
      const [solicitudes, pagos, eventosOcultos, sinPrograma] = await Promise.all([
        prisma.membershipApplication.count({ where: { status: { in: ['NUEVA', 'EN_REVISION'] } } }),
        prisma.enrollment.count({
          where: {
            paymentStatus: { in: ['PENDIENTE', 'PARCIAL'] },
            edition: { estado: { in: ['INSCRIPCIONES_ABIERTAS', 'EN_CURSO'] } },
          },
        }),
        prisma.event.count({ where: { publicado: false, fechaInicio: { gte: new Date() } } }),
        prisma.courseEdition.count({
          where: {
            estado: { in: ['INSCRIPCIONES_ABIERTAS', 'EN_CURSO'] },
            actividades: { none: {} },
          },
        }),
      ]);

      if (solicitudes > 0) {
        pendientes.push({
          tipo: 'SOLICITUDES',
          cantidad: solicitudes,
          titulo: solicitudes === 1 ? 'Solicitud de ingreso' : 'Solicitudes de ingreso',
          detalle:
            solicitudes === 1
              ? 'Una persona espera respuesta'
              : `${solicitudes} personas esperan respuesta`,
          ruta: '/panel/solicitudes',
          prioridad: 1,
        });
      }
      if (pagos > 0) {
        pendientes.push({
          tipo: 'PAGOS',
          cantidad: pagos,
          titulo: 'Pagos pendientes',
          detalle: `${pagos} inscripción(es) sin cubrir la cuota`,
          ruta: '/panel/ediciones',
          prioridad: 2,
        });
      }
      if (sinPrograma > 0) {
        pendientes.push({
          tipo: 'EDICION_SIN_PROGRAMA',
          cantidad: sinPrograma,
          titulo: 'Ediciones sin programa',
          detalle: `${sinPrograma} edición(es) abierta(s) sin sesiones cargadas`,
          ruta: '/panel/ediciones',
          prioridad: 3,
        });
      }
      if (eventosOcultos > 0) {
        pendientes.push({
          tipo: 'EVENTOS_SIN_PUBLICAR',
          cantidad: eventosOcultos,
          titulo: 'Eventos sin publicar',
          detalle: `${eventosOcultos} evento(s) futuro(s) que nadie ve todavía`,
          ruta: '/panel/eventos',
          prioridad: 4,
        });
      }
    } else if (req.user!.memberId) {
      // Jefe o tesorero de área: solo lo suyo.
      const areas = await prisma.areaMembership.findMany({
        where: {
          memberId: req.user!.memberId,
          activo: true,
          role: { in: ['JEFE_DE_AREA', 'TESORERO'] },
        },
        select: { areaId: true },
      });

      if (areas.length > 0) {
        const eventosOcultos = await prisma.event.count({
          where: {
            publicado: false,
            areaId: { in: areas.map((a) => a.areaId) },
            fechaInicio: { gte: new Date() },
          },
        });
        if (eventosOcultos > 0) {
          pendientes.push({
            tipo: 'EVENTOS_SIN_PUBLICAR',
            cantidad: eventosOcultos,
            titulo: 'Eventos de tu área sin publicar',
            detalle: `${eventosOcultos} evento(s) futuro(s) que nadie ve todavía`,
            ruta: '/panel/eventos',
            prioridad: 1,
          });
        }
      }
    }

    // Declaraciones de curso: cada quien ve solo las que puede resolver.
    const declaraciones = await contarDeclaracionesQueRevisa(req.user!);
    if (declaraciones > 0) {
      pendientes.push({
        tipo: 'DECLARACIONES',
        cantidad: declaraciones,
        titulo: declaraciones === 1 ? 'Curso por validar' : 'Cursos por validar',
        detalle:
          declaraciones === 1
            ? 'Alguien declaro un curso y espera tu visto bueno'
            : `${declaraciones} cursos declarados esperan tu visto bueno`,
        ruta: '/panel/validaciones',
        prioridad: 1,
      });
    }

    pendientes.sort((a, b) => a.prioridad - b.prioridad);

    res.json({
      total: pendientes.reduce((n, p) => n + p.cantidad, 0),
      solicitudes: pendientes.find((p) => p.tipo === 'SOLICITUDES')?.cantidad ?? 0,
      declaraciones,
      pendientes,
    });
  }),
);
