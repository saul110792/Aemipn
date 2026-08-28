import type { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodSchema } from 'zod';
import { badRequest } from '../lib/errors.js';

type Source = 'body' | 'query' | 'params';

/** Valida y reemplaza req[source] con el resultado tipado de Zod. */
export const validate =
  (schema: ZodSchema, source: Source = 'body') =>
  (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req[source]);
      if (source === 'query') {
        Object.defineProperty(req, 'query', { value: parsed, writable: true });
      } else {
        req[source] = parsed;
      }
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return next(
          badRequest(
            'Datos invalidos',
            err.issues.map((i) => ({ campo: i.path.join('.'), mensaje: i.message })),
          ),
        );
      }
      next(err);
    }
  };
