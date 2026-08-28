import type { NextFunction, Request, Response } from 'express';
import type { Cargo, GlobalRole } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { forbidden, unauthorized } from '../lib/errors.js';
import { verifyAccessToken, type AccessPayload } from '../lib/tokens.js';
import { enFunciones } from '../lib/jefaturas.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AccessPayload;
    }
  }
}

/** Exige un access token valido en el header Authorization. */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next(unauthorized('Falta el token de acceso'));
  try {
    req.user = verifyAccessToken(header.slice(7));
    next();
  } catch {
    next(unauthorized('Token invalido o expirado'));
  }
}

/** Exige uno de los roles globales indicados. */
export const requireRole =
  (...roles: GlobalRole[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden());
    next();
  };

/**
 * Permite la accion si el usuario es ADMIN/STAFF global, o si dentro del area
 * indicada (req.params[paramName]) tiene alguno de los cargos pedidos.
 * Con esto el jefe de area y el tesorero administran lo suyo sin ser admin global.
 *
 * Mira la jefatura, no la membresia: pertenecer al area no manda en ella.
 */
export const requireCargoDeArea =
  (cargos: Cargo[], paramName = 'areaId') =>
  async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized());
    if (req.user.role === 'ADMIN' || req.user.role === 'STAFF') return next();
    if (!req.user.memberId) return next(forbidden());

    const areaId = req.params[paramName];
    const jefatura = await prisma.jefatura.findFirst({
      where: { areaId, memberId: req.user.memberId, cargo: { in: cargos }, ...enFunciones() },
      select: { id: true },
    });

    if (!jefatura) return next(forbidden('No tienes ese cargo en el area'));
    next();
  };
