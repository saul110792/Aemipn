import { createHash, randomBytes, randomInt } from 'node:crypto';
import { prisma } from './prisma.js';
import { env } from './env.js';
import { enviarCorreo, plantillaRecuperacion } from './correo.js';

/** Vigencia de una recuperación. Más corta que la verificación de cuenta:
 * quien pide restablecer su contraseña suele estarlo haciendo en el momento. */
export const HORAS_VIGENCIA_RECUPERACION = 2;
export const INTENTOS_MAXIMOS_RECUPERACION = 6;

const hash = (v: string) => createHash('sha256').update(v).digest('hex');

/** Código corto para teclear a mano. Sin O/0/I/1 para no confundir al copiarlo. */
function generarCodigo(): string {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => alfabeto[randomInt(alfabeto.length)]).join('');
}

/**
 * Crea una recuperación nueva e invalida las anteriores del usuario, para que
 * una liga vieja no siga sirviendo después de pedir otra.
 */
export async function crearYEnviarRecuperacion(userId: string, email: string, nombre: string) {
  const token = randomBytes(32).toString('base64url');
  const codigo = generarCodigo();

  const expiraEn = new Date();
  expiraEn.setHours(expiraEn.getHours() + HORAS_VIGENCIA_RECUPERACION);

  await prisma.$transaction([
    prisma.passwordReset.updateMany({
      where: { userId, usadoEn: null },
      data: { usadoEn: new Date() },
    }),
    prisma.passwordReset.create({
      data: { userId, tokenHash: hash(token), codigoHash: hash(codigo), expiraEn },
    }),
  ]);

  const liga = `${env.APP_URL}/restablecer?token=${token}`;

  try {
    await enviarCorreo({
      para: email,
      asunto: 'Restablece tu contraseña · AEMIPN',
      texto: [
        `Hola, ${nombre}:`,
        '',
        'Pediste restablecer tu contraseña en el panel de la AEMIPN.',
        'Para elegir una nueva abre esta liga:',
        '',
        liga,
        '',
        `O escribe este código en el sitio: ${codigo}`,
        '',
        `La liga y el código sirven durante ${HORAS_VIGENCIA_RECUPERACION} horas.`,
        'Si no fuiste tú, ignora este mensaje: tu contraseña actual sigue siendo válida.',
      ].join('\n'),
      html: plantillaRecuperacion({ nombre, liga, codigo, horasVigencia: HORAS_VIGENCIA_RECUPERACION }),
    });
  } catch (err) {
    // Igual que en el registro: un correo que no sale no debe tumbar la
    // solicitud con un 500. El token ya quedo creado y sirve si se pide otro.
    console.error('[recuperacion] No se pudo enviar el correo de recuperación:', err);
  }

  return { token, codigo, expiraEn };
}

/** Resultado de resolver una recuperación, distinguiendo cada motivo de fallo. */
export type ResultadoRecuperacion =
  | { ok: true; registroId: string; userId: string }
  | { ok: false; motivo: 'NO_ENCONTRADA' | 'EXPIRADA' | 'YA_USADA' | 'DEMASIADOS_INTENTOS' };

/** Resuelve por liga (token) o por código escrito a mano, sin aplicar nada aún. */
export async function resolverRecuperacion(
  entrada: { token: string } | { codigo: string; email: string },
): Promise<ResultadoRecuperacion> {
  const registro =
    'token' in entrada
      ? await prisma.passwordReset.findUnique({ where: { tokenHash: hash(entrada.token) } })
      : await prisma.passwordReset.findFirst({
          where: {
            usadoEn: null,
            user: { email: entrada.email.toLowerCase() },
          },
          orderBy: { createdAt: 'desc' },
        });

  if (!registro) return { ok: false, motivo: 'NO_ENCONTRADA' };
  if (registro.usadoEn) return { ok: false, motivo: 'YA_USADA' };
  if (registro.expiraEn < new Date()) return { ok: false, motivo: 'EXPIRADA' };
  if (registro.intentos >= INTENTOS_MAXIMOS_RECUPERACION) return { ok: false, motivo: 'DEMASIADOS_INTENTOS' };

  // Con código hay que comprobarlo y contar el intento fallido.
  if ('codigo' in entrada) {
    if (registro.codigoHash !== hash(entrada.codigo.trim().toUpperCase())) {
      await prisma.passwordReset.update({
        where: { id: registro.id },
        data: { intentos: { increment: 1 } },
      });
      return { ok: false, motivo: 'NO_ENCONTRADA' };
    }
  }

  return { ok: true, registroId: registro.id, userId: registro.userId };
}
