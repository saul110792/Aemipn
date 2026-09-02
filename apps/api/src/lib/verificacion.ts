import { createHash, randomBytes, randomInt } from 'node:crypto';
import { prisma } from './prisma.js';
import { env } from './env.js';
import { enviarCorreo, plantillaVerificacion } from './correo.js';

/** Vigencia de una verificación. Pasada esta ventana hay que pedir otra. */
export const HORAS_VIGENCIA = 24;
/** Tras varios intentos fallidos el código deja de servir. */
export const INTENTOS_MAXIMOS = 6;

/** Se guarda el hash y nunca el valor: la base no debe poder activar cuentas. */
export const hash = (v: string) => createHash('sha256').update(v).digest('hex');

/** Código corto para teclear a mano. Sin O/0/I/1 para no confundir al copiarlo. */
function generarCodigo(): string {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => alfabeto[randomInt(alfabeto.length)]).join('');
}

/**
 * Crea una verificación nueva e invalida las anteriores del usuario, para que
 * una liga vieja no siga sirviendo después de pedir otra.
 */
export async function crearYEnviarVerificacion(userId: string, email: string, nombre: string) {
  const token = randomBytes(32).toString('base64url');
  const codigo = generarCodigo();

  const expiraEn = new Date();
  expiraEn.setHours(expiraEn.getHours() + HORAS_VIGENCIA);

  await prisma.$transaction([
    prisma.emailVerification.updateMany({
      where: { userId, usadoEn: null },
      data: { usadoEn: new Date() },
    }),
    prisma.emailVerification.create({
      data: { userId, tokenHash: hash(token), codigoHash: hash(codigo), expiraEn },
    }),
  ]);

  const liga = `${env.APP_URL}/verificar?token=${token}`;

  try {
    await enviarCorreo({
      para: email,
      asunto: 'Confirma tu cuenta · AEMIPN',
      texto: [
        `Hola, ${nombre}:`,
        '',
        'Recibimos tu registro en la Asociación de Excursionismo y Montañismo del IPN.',
        'Para activar tu cuenta abre esta liga:',
        '',
        liga,
        '',
        `O escribe este código en el sitio: ${codigo}`,
        '',
        `La liga y el código sirven durante ${HORAS_VIGENCIA} horas.`,
        'Si no fuiste tú, ignora este mensaje: la cuenta no se activa sola.',
      ].join('\n'),
      html: plantillaVerificacion({ nombre, liga, codigo, horasVigencia: HORAS_VIGENCIA }),
    });
  } catch (err) {
    // Un correo que no sale no debe tumbar el registro con un 500: la cuenta
    // y el token ya quedaron creados, solo no le llegó el aviso. Puede pedir
    // otro con /registro/reenviar en cuanto el correo vuelva a funcionar.
    console.error('[verificacion] No se pudo enviar el correo de confirmación:', err);
  }

  // Se devuelven para poder probarlo sin buzón; nunca salen por la API.
  return { token, codigo, expiraEn };
}

/** Resultado de intentar verificar, distinguiendo cada motivo de fallo. */
export type ResultadoVerificacion =
  | { ok: true; userId: string }
  | { ok: false; motivo: 'NO_ENCONTRADA' | 'EXPIRADA' | 'YA_USADA' | 'DEMASIADOS_INTENTOS' };

/** Verifica por liga (token) o por código escrito a mano. */
export async function verificar(
  entrada: { token: string } | { codigo: string; email: string },
): Promise<ResultadoVerificacion> {
  const registro =
    'token' in entrada
      ? await prisma.emailVerification.findUnique({ where: { tokenHash: hash(entrada.token) } })
      : await prisma.emailVerification.findFirst({
          where: {
            usadoEn: null,
            user: { email: entrada.email.toLowerCase() },
          },
          orderBy: { createdAt: 'desc' },
        });

  if (!registro) return { ok: false, motivo: 'NO_ENCONTRADA' };
  if (registro.usadoEn) return { ok: false, motivo: 'YA_USADA' };
  if (registro.expiraEn < new Date()) return { ok: false, motivo: 'EXPIRADA' };
  if (registro.intentos >= INTENTOS_MAXIMOS) return { ok: false, motivo: 'DEMASIADOS_INTENTOS' };

  // Con código hay que comprobarlo y contar el intento fallido.
  if ('codigo' in entrada) {
    if (registro.codigoHash !== hash(entrada.codigo.trim().toUpperCase())) {
      await prisma.emailVerification.update({
        where: { id: registro.id },
        data: { intentos: { increment: 1 } },
      });
      return { ok: false, motivo: 'NO_ENCONTRADA' };
    }
  }

  await prisma.$transaction([
    prisma.emailVerification.update({
      where: { id: registro.id },
      data: { usadoEn: new Date() },
    }),
    prisma.user.update({
      where: { id: registro.userId },
      data: { emailVerificadoEn: new Date(), activo: true },
    }),
  ]);

  return { ok: true, userId: registro.userId };
}
