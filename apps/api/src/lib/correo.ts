import { resolve4 } from 'node:dns/promises';
import { env, isProd } from './env.js';

export interface Mensaje {
  para: string;
  asunto: string;
  texto: string;
}

/**
 * nodemailer resuelve el host por IPv4 *o IPv6 al azar* (ver su
 * `formatDNSValue`), y varios entornos en la nube -Render incluido- anuncian
 * una interfaz IPv6 que no tiene salida real a internet: la mitad de las
 * veces la conexión truena con "ENETUNREACH" hacia una IP v6 de Gmail, aunque
 * el usuario y la contraseña sean correctos.
 *
 * Se resuelve la IPv4 a mano y se conecta directo a ella, dejando el hostname
 * solo para el SNI/TLS. Si por lo que sea no se puede resolver, se cae de
 * vuelta al comportamiento normal de nodemailer.
 */
async function crearTransporteSmtp() {
  const { createTransport } = await import('nodemailer');
  const url = new URL(env.SMTP_URL!);
  const opciones = {
    host: url.hostname,
    port: Number(url.port) || (url.protocol === 'smtps:' ? 465 : 587),
    secure: url.protocol === 'smtps:',
    auth: { user: decodeURIComponent(url.username), pass: decodeURIComponent(url.password) },
    tls: { servername: url.hostname },
  };

  try {
    const [ipv4] = await resolve4(url.hostname);
    if (ipv4) opciones.host = ipv4;
  } catch {
    // Sin IPv4 resoluble, se intenta con el hostname tal cual.
  }

  return createTransport(opciones);
}

/**
 * Envío de correo con dos motores.
 *
 * Sin credenciales SMTP configuradas, el mensaje se escribe en la consola del
 * servidor: en desarrollo eso basta para copiar la liga o el código y seguir
 * probando, sin depender de un buzón real.
 *
 * Con SMTP_URL definido se usa un envío real. La firma no cambia, así que el
 * resto del código no se entera de cuál está activo.
 */
export async function enviarCorreo(m: Mensaje): Promise<{ entregado: boolean; motor: string }> {
  if (!env.SMTP_URL) {
    // En producción esto es un problema, no una comodidad: hay que avisarlo.
    if (isProd) {
      console.error(
        `[correo] SMTP_URL no está configurado. El mensaje para ${m.para} NO se envió.`,
      );
      return { entregado: false, motor: 'ninguno' };
    }

    console.log(
      [
        '',
        '  ┌─ correo simulado ' + '─'.repeat(46),
        `  │ Para:   ${m.para}`,
        `  │ Asunto: ${m.asunto}`,
        '  │',
        ...m.texto.split('\n').map((l) => `  │ ${l}`),
        '  └' + '─'.repeat(64),
        '',
      ].join('\n'),
    );
    return { entregado: true, motor: 'consola' };
  }

  const transporte = await crearTransporteSmtp();
  await transporte.sendMail({
    from: env.SMTP_REMITENTE,
    to: m.para,
    subject: m.asunto,
    text: m.texto,
  });
  return { entregado: true, motor: 'smtp' };
}
