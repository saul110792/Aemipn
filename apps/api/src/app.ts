import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { env, isProd } from './lib/env.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { authRouter } from './routes/auth.routes.js';
import { membersRouter } from './routes/members.routes.js';
import { areasRouter } from './routes/areas.routes.js';
import { coursesRouter } from './routes/courses.routes.js';
import { editionsRouter } from './routes/editions.routes.js';
import { enrollmentsRouter } from './routes/enrollments.routes.js';
import { applicationsRouter } from './routes/applications.routes.js';
import { publicRouter } from './routes/public.routes.js';
import { dashboardRouter } from './routes/dashboard.routes.js';
import { eventsRouter } from './routes/events.routes.js';
import { notificationsRouter } from './routes/notifications.routes.js';
import { registroRouter } from './routes/registro.routes.js';
import { perfilRouter } from './routes/perfil.routes.js';
import { claimsRouter } from './routes/claims.routes.js';
import { calendarioRouter } from './routes/calendario.routes.js';
import { asistenciasRouter } from './routes/asistencias.routes.js';
import { CARPETA_SUBIDAS, mediaRouter } from './routes/media.routes.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  // Las imagenes subidas las pide el frontend desde otro origen en desarrollo.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
      credentials: true, // necesario para la cookie de refresh
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(morgan(isProd ? 'combined' : 'dev'));

  app.get('/api/health', (_req, res) =>
    res.json({ ok: true, servicio: 'aemipn-api', entorno: env.NODE_ENV }),
  );

  // Archivos subidos desde el panel. Inmutables: el nombre lleva un aleatorio.
  app.use(
    '/uploads',
    express.static(CARPETA_SUBIDAS, {
      maxAge: '30d',
      index: false,
      dotfiles: 'ignore',
      setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
    }),
  );

  app.use('/api/public', publicRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/members', membersRouter);
  app.use('/api/areas', areasRouter);
  app.use('/api/courses', coursesRouter);
  app.use('/api/editions', editionsRouter);
  app.use('/api/enrollments', enrollmentsRouter);
  app.use('/api/asistencias', asistenciasRouter);
  app.use('/api/applications', applicationsRouter);
  app.use('/api/events', eventsRouter);
  app.use('/api/notificaciones', notificationsRouter);
  app.use('/api/registro', registroRouter);
  app.use('/api/perfil', perfilRouter);
  app.use('/api/claims', claimsRouter);
  app.use('/api/calendario', calendarioRouter);
  app.use('/api/media', mediaRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
