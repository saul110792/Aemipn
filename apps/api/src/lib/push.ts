import webpush from 'web-push';
import { prisma } from './prisma.js';
import { env } from './env.js';

/** ¿Hay llaves VAPID configuradas? Sin ellas, el envío se salta en silencio. */
export const pushDisponible = Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);

if (pushDisponible) {
  webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY!, env.VAPID_PRIVATE_KEY!);
}

export interface PayloadPush {
  titulo: string;
  cuerpo: string;
  /// A dónde llevar al tocar la notificación. Relativa, se resuelve contra APP_URL.
  url?: string;
}

/**
 * Manda un push a todas las suscripciones de estos usuarios.
 *
 * Una suscripción vencida o revocada responde 404/410: se borra sola en vez
 * de seguir intentando cada vez que haya algo que avisar.
 */
export async function enviarPush(userIds: string[], payload: PayloadPush) {
  if (!pushDisponible || userIds.length === 0) return;

  const suscripciones = await prisma.pushSubscription.findMany({
    where: { userId: { in: userIds } },
  });
  if (suscripciones.length === 0) return;

  const cuerpo = JSON.stringify(payload);

  await Promise.all(
    suscripciones.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          cuerpo,
        );
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
        } else {
          console.error(`[push] Fallo al enviar a ${s.id}:`, err);
        }
      }
    }),
  );
}
