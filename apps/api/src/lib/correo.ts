import { resolve4 } from 'node:dns/promises';
import { env, isProd } from './env.js';

export interface Mensaje {
  para: string;
  asunto: string;
  texto: string;
}

/** Separa "AEMIPN <no-responder@aemipn.mx>" en nombre y correo. */
function partirRemitente(remitente: string) {
  const m = remitente.match(/^(.*?)\s*<(.+)>$/);
  return m ? { name: m[1].trim(), email: m[2].trim() } : { name: remitente, email: remitente };
}

/**
 * Envía por la API HTTP de Brevo (antes Sendinblue).
 *
 * Hace falta en Render: su plan gratuito bloquea las conexiones salientes a
 * los puertos SMTP (25, 465, 587), así que Gmail —o cualquier SMTP— quedan
 * inservibles ahí sin importar la configuración. La API de Brevo viaja por
 * HTTPS (443), que nunca se bloquea.
 */
async function enviarPorBrevo(m: Mensaje) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': env.BREVO_API_KEY!,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: partirRemitente(env.SMTP_REMITENTE),
      to: [{ email: m.para }],
      subject: m.asunto,
      textContent: m.texto,
    }),
  });

  if (!res.ok) {
    const detalle = await res.text().catch(() => '');
    throw new Error(`Brevo respondió ${res.status}: ${detalle}`);
  }
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
 * Envío de correo con tres motores, en este orden de preferencia:
 * Brevo (BREVO_API_KEY) → SMTP (SMTP_URL) → consola.
 *
 * Sin ninguna credencial configurada, el mensaje se escribe en la consola
 * del servidor: en desarrollo eso basta para copiar la liga o el código y
 * seguir probando, sin depender de un buzón real.
 *
 * La firma no cambia entre motores, así que el resto del código no se
 * entera de cuál está activo.
 */
export async function enviarCorreo(m: Mensaje): Promise<{ entregado: boolean; motor: string }> {
  if (env.BREVO_API_KEY) {
    await enviarPorBrevo(m);
    return { entregado: true, motor: 'brevo' };
  }

  if (env.SMTP_URL) {
    const transporte = await crearTransporteSmtp();
    await transporte.sendMail({
      from: env.SMTP_REMITENTE,
      to: m.para,
      subject: m.asunto,
      text: m.texto,
    });
    return { entregado: true, motor: 'smtp' };
  }

  // En producción esto es un problema, no una comodidad: hay que avisarlo.
  if (isProd) {
    console.error(
      `[correo] Ni BREVO_API_KEY ni SMTP_URL están configurados. El mensaje para ${m.para} NO se envió.`,
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
