import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { conflict, unauthorized } from '../lib/errors.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { isProd } from '../lib/env.js';
import {
  REFRESH_COOKIE,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../lib/tokens.js';

export const authRouter = Router();

/** Freno a la fuerza bruta sobre el login. */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
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
  member?: { nombre: string; apellidoPaterno: string; fotoUrl: string | null } | null;
}) => ({
  id: user.id,
  email: user.email,
  role: user.role,
  memberId: user.memberId,
  nombre: user.member ? `${user.member.nombre} ${user.member.apellidoPaterno}` : null,
  fotoUrl: user.member?.fotoUrl ?? null,
});

authRouter.post(
  '/login',
  loginLimiter,
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body as z.infer<typeof loginSchema>;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { member: { select: { nombre: true, apellidoPaterno: true, fotoUrl: true } } },
    });

    // Mismo mensaje para usuario inexistente y contrasena incorrecta.
    if (!user || !user.activo) throw unauthorized('Correo o contrasena incorrectos');
    if (!(await bcrypt.compare(password, user.passwordHash))) {
      throw unauthorized('Correo o contrasena incorrectos');
    }

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

    res.cookie(REFRESH_COOKIE, signRefreshToken(user.id), refreshCookieOptions);
    res.json({ accessToken, user: publicUser(user) });
  }),
);

authRouter.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE];
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
      include: { member: { select: { nombre: true, apellidoPaterno: true, fotoUrl: true } } },
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
