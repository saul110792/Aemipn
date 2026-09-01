import { resolve4 } from 'node:dns/promises';
import { env, isProd } from './env.js';

export interface Mensaje {
  para: string;
  asunto: string;
  texto: string;
  /// Version con diseño, opcional. Sin ella se manda solo texto plano.
  html?: string;
}

/**
 * Envoltura visual común a todos los correos: cabecera guinda con el nombre
 * de la asociación, cuerpo blanco, pie con el nombre completo.
 *
 * Sin logotipo: el escudo de la AEMIPN (apps/web/public/escudo-aemipn.png)
 * no siempre está subido (ver su LEEME.md), y muchos clientes de correo
 * bloquean imágenes externas por default — el texto no depende de que carguen.
 */
function plantillaCorreo(cuerpo: string) {
  return `
<div style="background:#f6eaef;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e6d7dd;">
    <div style="background:#611232;padding:26px 24px;text-align:center;">
      <div style="font-family:Georgia,'Times New Roman',serif;font-weight:800;font-size:22px;color:#ffffff;letter-spacing:0.03em;">
        AEMIPN
      </div>
      <div style="font-size:12px;color:#e8c3d2;margin-top:2px;">
        Excursionismo y Montañismo · IPN
      </div>
    </div>
    <div style="padding:32px 28px;color:#2a1620;line-height:1.6;font-size:15px;">
      ${cuerpo}
    </div>
    <div style="background:#f6eaef;padding:14px 24px;text-align:center;font-size:11px;color:#932352;">
      Asociación de Excursionismo y Montañismo del Instituto Politécnico Nacional
    </div>
  </div>
</div>`.trim();
}

/** Correo de confirmación de cuenta, con la liga y el código a la vista. */
export function plantillaVerificacion({
  nombre,
  liga,
  codigo,
  horasVigencia,
}: {
  nombre: string;
  liga: string;
  codigo: string;
  horasVigencia: number;
}) {
  return plantillaCorreo(`
    <h1 style="font-size:19px;margin:0 0 16px;color:#611232;">Confirma tu cuenta</h1>
    <p style="margin:0 0 12px;">Hola, ${nombre}:</p>
    <p style="margin:0 0 20px;">
      Recibimos tu registro en la Asociación de Excursionismo y Montañismo del IPN. Para activar
      tu cuenta, entra al siguiente botón:
    </p>
    <p style="text-align:center;margin:0 0 20px;">
      <a href="${liga}" style="background:#611232;color:#ffffff;text-decoration:none;padding:12px 30px;border-radius:8px;font-weight:700;display:inline-block;">
        Confirmar mi cuenta
      </a>
    </p>
    <p style="font-size:12.5px;color:#7a6169;margin:0 0 20px;word-break:break-all;">
      Si el botón no funciona, copia y pega esta liga en tu navegador:<br />
      <a href="${liga}" style="color:#932352;">${liga}</a>
    </p>
    <p style="margin:0 0 8px;">O escribe este código en el sitio:</p>
    <p style="text-align:center;margin:0 0 20px;">
      <span style="display:inline-block;background:#f6eaef;color:#611232;font-family:'Courier New',monospace;font-size:22px;font-weight:700;letter-spacing:0.18em;padding:10px 20px;border-radius:8px;">
        ${codigo}
      </span>
    </p>
    <p style="font-size:12.5px;color:#7a6169;margin:24px 0 0;">
      La liga y el código sirven durante ${horasVigencia} horas. Si no fuiste tú, ignora este
      mensaje: la cuenta no se activa sola.
    </p>
  `);
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
      // Brevo solo acepta un tipo de cuerpo por solicitud: con diseño manda
      // ese, y si no hay, el texto plano.
      ...(m.html ? { htmlContent: m.html } : { textContent: m.texto }),
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
      ...(m.html ? { html: m.html } : {}),
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
