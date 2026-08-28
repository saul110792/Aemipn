import jwt from 'jsonwebtoken';
import type { GlobalRole } from '@prisma/client';
import { env } from './env.js';

export type AccessPayload = {
  sub: string;
  email: string;
  role: GlobalRole;
  memberId: string | null;
};

export const signAccessToken = (payload: AccessPayload) =>
  jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_TTL } as jwt.SignOptions);

export const signRefreshToken = (userId: string) =>
  jwt.sign({ sub: userId }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_TTL,
  } as jwt.SignOptions);

export const verifyAccessToken = (token: string) =>
  jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessPayload & { iat: number; exp: number };

export const verifyRefreshToken = (token: string) =>
  jwt.verify(token, env.JWT_REFRESH_SECRET) as { sub: string; iat: number; exp: number };

export const REFRESH_COOKIE = 'aemipn_refresh';
