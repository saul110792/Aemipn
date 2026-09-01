import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

/** Configuración global del sitio (redes sociales): no pertenece a ningún área. */
export const configuracionRouter = Router();

/// Vacío guarda null en vez de una URL a medio escribir.
const urlOpcional = z
  .string()
  .trim()
  .url('Debe ser una URL válida (empieza con https://)')
  .optional()
  .nullable()
  .or(z.literal('').transform(() => null));

const schema = z.object({
  facebookUrl: urlOpcional,
  instagramUrl: urlOpcional,
  xUrl: urlOpcional,
  youtubeUrl: urlOpcional,
  tiktokUrl: urlOpcional,
  whatsappUrl: urlOpcional,
});

configuracionRouter.patch(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  validate(schema),
  asyncHandler(async (req, res) => {
    const data = req.body as z.infer<typeof schema>;
    res.json(
      await prisma.siteSettings.upsert({
        where: { id: 'global' },
        create: { id: 'global', ...data },
        update: data,
      }),
    );
  }),
);
