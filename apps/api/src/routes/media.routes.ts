import { randomBytes } from 'node:crypto';
import { extname, join } from 'node:path';
import { unlink } from 'node:fs/promises';
import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { badRequest, notFound } from '../lib/errors.js';
import { validate } from '../middleware/validate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

/** Carpeta en disco donde viven los archivos subidos. */
export const CARPETA_SUBIDAS = join(process.cwd(), 'uploads');

const TIPOS_PERMITIDOS = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
const EXTENSIONES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/avif': '.avif',
};

const almacenamiento = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, CARPETA_SUBIDAS),
  filename: (_req, file, cb) => {
    // Nombre aleatorio: el del usuario podria traer rutas o caracteres raros.
    const ext = EXTENSIONES[file.mimetype] ?? extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${randomBytes(6).toString('hex')}${ext}`);
  },
});

const subida = multer({
  storage: almacenamiento,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!TIPOS_PERMITIDOS.has(file.mimetype)) {
      return cb(new Error('Solo se aceptan imágenes JPG, PNG, WebP o AVIF'));
    }
    cb(null, true);
  },
});

export const mediaRouter = Router();
mediaRouter.use(requireAuth, requireRole('ADMIN', 'STAFF'));

/** GET /api/media — biblioteca de imagenes, la mas reciente primero. */
mediaRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json(await prisma.mediaAsset.findMany({ orderBy: { createdAt: 'desc' }, take: 200 }));
  }),
);

/** POST /api/media — sube una imagen (campo "archivo"). */
mediaRouter.post(
  '/',
  (req, res, next) => {
    subida.single('archivo')(req, res, (err) => {
      if (!err) return next();
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return next(badRequest('La imagen no debe pesar más de 5 MB'));
      }
      next(badRequest(err instanceof Error ? err.message : 'No se pudo subir el archivo'));
    });
  },
  asyncHandler(async (req, res) => {
    if (!req.file) throw badRequest('No llegó ningún archivo');

    const asset = await prisma.mediaAsset.create({
      data: {
        url: `/uploads/${req.file.filename}`,
        filename: req.file.filename,
        mime: req.file.mimetype,
        size: req.file.size,
        alt: typeof req.body.alt === 'string' && req.body.alt.trim() ? req.body.alt.trim() : null,
        subidoPor: req.user!.email,
      },
    });

    res.status(201).json(asset);
  }),
);

mediaRouter.patch(
  '/:id',
  validate(z.object({ alt: z.string().max(300).nullable() })),
  asyncHandler(async (req, res) => {
    res.json(await prisma.mediaAsset.update({ where: { id: req.params.id }, data: { alt: req.body.alt } }));
  }),
);

/** DELETE /api/media/:id — borra el registro y el archivo del disco. */
mediaRouter.delete(
  '/:id',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const asset = await prisma.mediaAsset.findUnique({ where: { id: req.params.id } });
    if (!asset) throw notFound('Imagen no encontrada');

    await prisma.mediaAsset.delete({ where: { id: asset.id } });

    // Si el archivo ya no estaba, el registro igual se fue: no es motivo de error.
    await unlink(join(CARPETA_SUBIDAS, asset.filename)).catch(() => undefined);

    res.json({ ok: true });
  }),
);
