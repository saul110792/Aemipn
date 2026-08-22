import { createApp } from './app.js';
import { env } from './lib/env.js';
import { prisma } from './lib/prisma.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`\n  API AEMIPN escuchando en http://localhost:${env.PORT}`);
  console.log(`  Salud:  http://localhost:${env.PORT}/api/health`);
  console.log(`  Origen permitido: ${env.CORS_ORIGIN}\n`);
});

const shutdown = async (signal: string) => {
  console.log(`\n${signal} recibido, cerrando...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
};

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
