import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { env } from '../lib/env.js';
import { pushDisponible } from '../lib/push.js';

/** Suscripciones de Web Push. Todo esto requiere sesión: el push es por usuario. */
export const pushRouter = Router();

pushRouter.use(requireAuth);

/** GET /api/push/config — si hay push disponible, y con qué llave suscribirse. */
pushRouter.get('/config', (_req, res) => {
  res.json({ disponible: pushDisponible, clavePublica: pushDisponible ? env.VAPID_PUBLIC_KEY : null });
});

const suscripcionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

/** POST /api/push/suscripciones — guarda o refresca la suscripción de este dispositivo. */
pushRouter.post(
  '/suscripciones',
  validate(suscripcionSchema),
  asyncHandler(async (req, res) => {
    const d = req.body as z.infer<typeof suscripcionSchema>;

    await prisma.pushSubscription.upsert({
      where: { endpoint: d.endpoint },
      // Un mismo endpoint que reaparece con otra sesion (celular compartido,
      // o el usuario volvio a iniciar sesion) se reasigna en vez de duplicarse.
      update: { userId: req.user!.sub, p256dh: d.keys.p256dh, auth: d.keys.auth },
      create: { userId: req.user!.sub, endpoint: d.endpoint, p256dh: d.keys.p256dh, auth: d.keys.auth },
    });

    res.status(201).json({ ok: true });
  }),
);

/** DELETE /api/push/suscripciones?endpoint=… — deja de mandarle push a este dispositivo. */
pushRouter.delete(
  '/suscripciones',
  asyncHandler(async (req, res) => {
    const endpoint = req.query.endpoint as string | undefined;
    if (endpoint) {
      await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: req.user!.sub } });
    }
    res.json({ ok: true });
  }),
);

/** GET /api/push/suscripciones/activa — ¿este endpoint ya está guardado? */
pushRouter.get(
  '/suscripciones/activa',
  asyncHandler(async (req, res) => {
    const endpoint = req.query.endpoint as string | undefined;
    if (!endpoint) return res.json({ activa: false });
    const existe = await prisma.pushSubscription.findFirst({
      where: { endpoint, userId: req.user!.sub },
      select: { id: true },
    });
    res.json({ activa: Boolean(existe) });
  }),
);
