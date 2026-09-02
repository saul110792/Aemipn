import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { notFound } from '../lib/errors.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

/**
 * Anuncios del carrusel de la portada: gestión desde el panel (mesa
 * directiva). La lectura pública vive en public.routes.ts, sin sesión.
 */
export const anunciosRouter = Router();
anunciosRouter.use(requireAuth, requireRole('ADMIN', 'STAFF'));

const urlOpcional = z
  .string()
  .trim()
  .url('Debe ser una URL válida')
  .optional()
  .nullable()
  .or(z.literal('').transform(() => null));

const anuncioSchema = z.object({
  titulo: z.string().min(1, 'El título es obligatorio').max(120),
  descripcion: z.string().max(400).optional().nullable(),
  imagenUrl: z.string().optional().nullable(),
  enlaceUrl: urlOpcional,
  enlaceTexto: z.string().max(40).optional().nullable(),
  publicado: z.boolean().default(true),
  orden: z.coerce.number().int().default(0),
});

/** GET /api/anuncios — todos, publicados o no, para administrarlos. */
anunciosRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json(await prisma.anuncio.findMany({ orderBy: [{ orden: 'asc' }, { createdAt: 'asc' }] }));
  }),
);

anunciosRouter.post(
  '/',
  validate(anuncioSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await prisma.anuncio.create({ data: req.body }));
  }),
);

anunciosRouter.patch(
  '/:id',
  validate(anuncioSchema.partial()),
  asyncHandler(async (req, res) => {
    const actual = await prisma.anuncio.findUnique({ where: { id: req.params.id } });
    if (!actual) throw notFound('Anuncio no encontrado');
    res.json(await prisma.anuncio.update({ where: { id: actual.id }, data: req.body }));
  }),
);

anunciosRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const actual = await prisma.anuncio.findUnique({ where: { id: req.params.id } });
    if (!actual) throw notFound('Anuncio no encontrado');
    await prisma.anuncio.delete({ where: { id: actual.id } });
    res.json({ ok: true });
  }),
);
