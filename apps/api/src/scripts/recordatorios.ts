/**
 * Recordatorio de "voy a asistir", un día antes de la salida.
 *
 * Pensado para correr como Cron Job de Render cada hora (ver render.yaml):
 * revisa quién confirmó una salida que empieza mañana y no ha recibido su
 * recordatorio, le manda el push, y lo marca para no repetirlo en la
 * siguiente corrida.
 *
 * La ventana (23 a 25 horas de aquí a la salida) es más ancha que el paso
 * del cron (1 hora) a propósito: así ninguna salida cae entre dos corridas
 * y se queda sin avisar. `recordatorioEnviadoEn` evita que la superposición
 * mande el mismo aviso dos veces.
 */
import { prisma } from '../lib/prisma.js';
import { enviarPush, pushDisponible } from '../lib/push.js';

async function main() {
  if (!pushDisponible) {
    console.log('[recordatorios] Sin llaves VAPID configuradas: no hay nada que mandar.');
    return;
  }

  const ahora = new Date();
  const desde = new Date(ahora.getTime() + 23 * 60 * 60 * 1000);
  const hasta = new Date(ahora.getTime() + 25 * 60 * 60 * 1000);

  const pendientes = await prisma.eventRsvp.findMany({
    where: {
      recordatorioEnviadoEn: null,
      event: { fechaInicio: { gte: desde, lte: hasta } },
      member: { user: { isNot: null } },
    },
    select: {
      id: true,
      member: { select: { user: { select: { id: true } } } },
      event: { select: { titulo: true, lugar: true, id: true } },
    },
  });

  console.log(`[recordatorios] ${pendientes.length} confirmación(es) por avisar.`);

  for (const rsvp of pendientes) {
    const userId = rsvp.member.user?.id;
    if (!userId) continue;

    await enviarPush([userId], {
      titulo: 'Mañana es tu salida',
      cuerpo: rsvp.event.lugar ? `${rsvp.event.titulo} · ${rsvp.event.lugar}` : rsvp.event.titulo,
      url: '/panel/calendario',
    });

    await prisma.eventRsvp.update({
      where: { id: rsvp.id },
      data: { recordatorioEnviadoEn: new Date() },
    });
  }
}

main()
  .catch((err) => {
    console.error('[recordatorios] Error:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
