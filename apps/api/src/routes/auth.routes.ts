import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { badRequest, conflict, unauthorized } from '../lib/errors.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { exponeCodigosDePrueba, isProd } from '../lib/env.js';
import { crearYEnviarRecuperacion, resolverRecuperacion } from '../lib/recuperacion.js';
import {
  REFRESH_COOKIE,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../lib/tokens.js';

export const authRouter = Router();

/**
 * Freno a la fuerza bruta sobre el login.
 *
 * En desarrollo el tope es alto: probar el sistema con las cuentas de prueba
 * exige entrar y salir muchas veces, y un limite pensado para un atacante
 * acaba estorbando a quien esta revisando su propio sistema. En produccion
 * sigue siendo estricto, que es donde importa.
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isProd ? 10 : 200,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de acceso. Intenta de nuevo en 15 minutos.' },
});

const loginSchema = z.object({
  email: z.string().email('Correo invalido'),
  password: z.string().min(1, 'La contrasena es obligatoria'),
});

const changePasswordSchema = z.object({
  actual: z.string().min(1),
  nueva: z.string().min(8, 'La nueva contrasena debe tener al menos 8 caracteres'),
});

/** Mismo freno que el registro: no es un login, pero igual manda correos. */
const recuperacionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 8,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Demasiados intentos desde este equipo. Intenta mas tarde.' },
});

const olvidePasswordSchema = z.object({ email: z.string().email('Correo invalido') });

const restablecerPasswordSchema = z
  .object({
    token: z.string().optional(),
    codigo: z.string().optional(),
    email: z.string().email().optional(),
    nueva: z.string().min(8, 'La nueva contrasena debe tener al menos 8 caracteres'),
  })
  .refine((d) => d.token || (d.codigo && d.email), {
    message: 'Hace falta la liga de recuperacion, o el codigo junto con tu correo',
  });

const MOTIVOS_RECUPERACION: Record<string, string> = {
  NO_ENCONTRADA: 'La liga o el codigo no son validos.',
  EXPIRADA: 'La liga vencio. Pide otra desde "olvidé mi contraseña".',
  YA_USADA: 'Esta liga ya se uso. Pide otra si sigues sin poder entrar.',
  DEMASIADOS_INTENTOS: 'Demasiados intentos con este codigo. Pide uno nuevo.',
};

const refreshCookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: 'lax' as const,
  path: '/api/auth',
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

const publicUser = (user: {
  id: string;
  email: string;
  role: string;
  memberId: string | null;
  member?: {
    nombre: string;
    apellidoPaterno: string;
    fotoUrl: string | null;
    jefaturas?: { areaId: string }[];
  } | null;
}) => ({
  id: user.id,
  email: user.email,
  role: user.role,
  memberId: user.memberId,
  nombre: user.member ? `${user.member.nombre} ${user.member.apellidoPaterno}` : null,
  fotoUrl: user.member?.fotoUrl ?? null,
  /// Cuantas areas encabeza. El cliente lo usa para no ofrecer pantallas
  /// que la API le negaria de todos modos.
  areasQueEncabeza: new Set(user.member?.jefaturas?.map((j) => j.areaId) ?? []).size,
  /// Cuales areas, para ocultar acciones (publicar/borrar un evento, etc.)
  /// que solo el jefe/tesorero de ESA area en particular puede usar.
  areaIdsQueEncabeza: [...new Set(user.member?.jefaturas?.map((j) => j.areaId) ?? [])],
});

authRouter.post(
  '/login',
  loginLimiter,
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body as z.infer<typeof loginSchema>;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
    member: {
      select: {
        nombre: true,
        apellidoPaterno: true,
        fotoUrl: true,
        // Encabezar es tener un cargo en funciones, no pertenecer al area.
        jefaturas: {
          where: { OR: [{ hasta: null }, { hasta: { gte: new Date() } }] },
          select: { areaId: true },
        },
      },
    },
  },
    });

    // Mismo mensaje para usuario inexistente y contrasena incorrecta.
    if (!user) throw unauthorized('Correo o contrasena incorrectos');
    if (!(await bcrypt.compare(password, user.passwordHash))) {
      throw unauthorized('Correo o contrasena incorrectos');
    }

    // La contrasena es correcta: aqui ya se puede decir por que no entra,
    // sin revelar nada a quien solo esta probando correos.
    if (!user.emailVerificadoEn) {
      throw unauthorized('Confirma tu correo antes de entrar. Revisa la liga que te enviamos.');
    }
    if (!user.activo) throw unauthorized('Tu cuenta esta desactivada. Contacta a la mesa directiva.');

    await prisma.user.update({
      where: { id: user.id },
      data: { ultimoAcceso: new Date() },
    });

    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      memberId: user.memberId,
    });

    const refreshToken = signRefreshToken(user.id);
    if (esCliente(req)) {
      res.json({ accessToken, refreshToken, user: publicUser(user) });
    } else {
      res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions);
      res.json({ accessToken, user: publicUser(user) });
    }
  }),
);

/**
 * ¿La petición viene de una app y no de un navegador?
 *
 * En la web el refresh vive en una cookie `httpOnly` para que un XSS no pueda
 * leerlo. Una app no tiene ese problema ni ese mecanismo: guarda el token en el
 * llavero del sistema, que el resto del teléfono no puede abrir. Por eso se le
 * entrega en el cuerpo — pero solo si lo pide explícitamente, para no debilitar
 * a la web devolviéndoselo a todo el mundo.
 */
const esCliente = (req: { header: (n: string) => string | undefined }) =>
  req.header('x-cliente')?.toLowerCase() === 'movil';

authRouter.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    // La app lo manda en el cuerpo; el navegador, en la cookie.
    const token = (req.body as { refreshToken?: string } | undefined)?.refreshToken
      ?? req.cookies?.[REFRESH_COOKIE];
    if (!token) throw unauthorized('No hay sesion activa');

    let userId: string;
    try {
      userId = verifyRefreshToken(token).sub;
    } catch {
      res.clearCookie(REFRESH_COOKIE, refreshCookieOptions);
      throw unauthorized('Sesion expirada, vuelve a iniciar sesion');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
    member: {
      select: {
        nombre: true,
        apellidoPaterno: true,
        fotoUrl: true,
        // Encabezar es tener un cargo en funciones, no pertenecer al area.
        jefaturas: {
          where: { OR: [{ hasta: null }, { hasta: { gte: new Date() } }] },
          select: { areaId: true },
        },
      },
    },
  },
    });
    if (!user || !user.activo) throw unauthorized('Cuenta desactivada');

    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      memberId: user.memberId,
    });

    res.json({ accessToken, user: publicUser(user) });
  }),
);

authRouter.post('/logout', (req, res) => {
  res.clearCookie(REFRESH_COOKIE, refreshCookieOptions);
  res.json({ ok: true });
});

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.sub },
      include: {
        member: {
          include: {
            areas: { where: { activo: true }, include: { area: true } },
          },
        },
      },
    });
    if (!user) throw unauthorized();

    const { passwordHash, ...safe } = user;
    res.json(safe);
  }),
);

authRouter.post(
  '/change-password',
  requireAuth,
  validate(changePasswordSchema),
  asyncHandler(async (req, res) => {
    const { actual, nueva } = req.body as z.infer<typeof changePasswordSchema>;

    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!user) throw unauthorized();
    if (!(await bcrypt.compare(actual, user.passwordHash))) {
      throw conflict('La contrasena actual no coincide');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(nueva, 12) },
    });

    res.json({ ok: true });
  }),
);

/**
 * POST /api/auth/olvide-password
 *
 * La respuesta es igual exista o no esa cuenta: si dijera "no existe" o "esa
 * cuenta esta desactivada" cualquiera podria usarlo para saber quien esta
 * registrado, igual que en /registro.
 */
authRouter.post(
  '/olvide-password',
  recuperacionLimiter,
  validate(olvidePasswordSchema),
  asyncHandler(async (req, res) => {
    const email = (req.body.email as string).toLowerCase();
    const user = await prisma.user.findUnique({ where: { email }, include: { member: true } });

    let pruebas: { token: string; codigo: string } | undefined;
    if (user && user.activo) {
      const r = await crearYEnviarRecuperacion(user.id, email, user.member?.nombre ?? 'hola');
      pruebas = { token: r.token, codigo: r.codigo };
    }

    res.json({
      ok: true,
      mensaje: 'Si esa cuenta existe, te enviamos un correo con la liga para restablecer tu contrasena.',
      // Solo con EXPONER_CODIGOS_DE_PRUEBA=true, y nunca en produccion.
      ...(exponeCodigosDePrueba && pruebas ? { _pruebas: pruebas } : {}),
    });
  }),
);

/** POST /api/auth/restablecer-password — por liga o por codigo, fija la nueva contrasena. */
authRouter.post(
  '/restablecer-password',
  recuperacionLimiter,
  validate(restablecerPasswordSchema),
  asyncHandler(async (req, res) => {
    const d = req.body as z.infer<typeof restablecerPasswordSchema>;

    const r = await resolverRecuperacion(
      d.token ? { token: d.token } : { codigo: d.codigo!, email: d.email! },
    );
    if (!r.ok) throw badRequest(MOTIVOS_RECUPERACION[r.motivo] ?? 'No se pudo restablecer la contrasena.');

    await prisma.$transaction([
      prisma.passwordReset.update({ where: { id: r.registroId }, data: { usadoEn: new Date() } }),
      prisma.user.update({
        where: { id: r.userId },
        data: { passwordHash: await bcrypt.hash(d.nueva, 12) },
      }),
    ]);

    res.json({ ok: true, mensaje: 'Contrasena actualizada. Ya puedes iniciar sesion.' });
  }),
);
