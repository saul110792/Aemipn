import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { forbidden, notFound } from '../lib/errors.js';
import { requireAuth } from '../middleware/auth.js';
import { CARGOS_DE_MESA, areasConCargo } from '../lib/jefaturas.js';

/** Mensajes del formulario público "Contáctanos", ya dentro del panel. */
export const contactoRouter = Router();
contactoRouter.use(requireAuth);

/** Áreas cuyos mensajes puede ver esta persona. `null` = todas (mesa directiva). */
async function areasQueVe(user: { role: string; memberId: string | null }) {
  if (user.role === 'ADMIN' || user.role === 'STAFF') return null;
  if (!user.memberId) return [];
  return areasConCargo(user.memberId, CARGOS_DE_MESA);
}

/**
 * GET /api/contacto
 *
 * Un mensaje sin área es para la mesa directiva; uno con área, para el
 * jefe/tesorero de esa área — mismo reparto que ya usan los eventos.
 */
contactoRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const visibles = await areasQueVe(req.user!);
    if (visibles !== null && visibles.length === 0) {
      throw forbidden('Los mensajes de contacto los ve la mesa directiva y los jefes de área');
    }

    const mensajes = await prisma.contactMessage.findMany({
      where: visibles === null ? {} : { areaId: { in: visibles } },
      include: { area: { select: { nombre: true, color: true } } },
      // Sin leer primero, y entre esos el más nuevo primero.
      orderBy: [{ leidoEn: { sort: 'asc', nulls: 'first' } }, { createdAt: 'desc' }],
    });

    res.json(mensajes);
  }),
);

/** PATCH /api/contacto/:id — marcarlo como leído. */
contactoRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const mensaje = await prisma.contactMessage.findUnique({ where: { id: req.params.id } });
    if (!mensaje) throw notFound('Mensaje no encontrado');

    const visibles = await areasQueVe(req.user!);
    if (visibles !== null && (!mensaje.areaId || !visibles.includes(mensaje.areaId))) {
      throw forbidden();
    }

    res.json(
      await prisma.contactMessage.update({
        where: { id: mensaje.id },
        data: { leidoEn: new Date(), leidoPor: req.user!.email },
      }),
    );
  }),
);
