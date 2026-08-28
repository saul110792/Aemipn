import { env, isProd } from './env.js';

export interface Mensaje {
  para: string;
  asunto: string;
  texto: string;
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

  // nodemailer se carga solo si de verdad hay SMTP, para no volverlo
  // dependencia obligatoria de quien no manda correo.
  const { createTransport } = await import('nodemailer');
  const transporte = createTransport(env.SMTP_URL);
  await transporte.sendMail({
    from: env.SMTP_REMITENTE,
    to: m.para,
    subject: m.asunto,
    text: m.texto,
  });
  return { entregado: true, motor: 'smtp' };
}
