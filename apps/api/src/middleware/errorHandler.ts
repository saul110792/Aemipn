import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { HttpError } from '../lib/errors.js';
import { isProd } from '../lib/env.js';

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, detalles: err.details });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const campos = (err.meta?.target as string[] | undefined)?.join(', ') ?? 'un campo unico';
      return res.status(409).json({ error: `Ya existe un registro con ese valor en: ${campos}` });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Recurso no encontrado' });
    }
    if (err.code === 'P2003') {
      return res.status(409).json({ error: 'El registro esta referenciado por otros datos' });
    }
  }

  console.error('[error no controlado]', err);
  res.status(500).json({
    error: 'Error interno del servidor',
    ...(isProd ? {} : { detalle: err instanceof Error ? err.message : String(err) }),
  });
}
