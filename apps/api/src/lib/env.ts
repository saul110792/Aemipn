import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, 'Falta DATABASE_URL (copia apps/api/.env.example a .env)'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET debe tener al menos 16 caracteres'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET debe tener al menos 16 caracteres'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('30d'),
  /// Dirección pública del sitio; se usa para armar la liga de verificación.
  APP_URL: z.string().default('http://localhost:5173'),
  /// Sin esto, los correos se imprimen en la consola en lugar de enviarse.
  SMTP_URL: z.string().optional(),
  /// Devuelve el token y el código de verificación en la respuesta del registro.
  ///
  /// Es una comodidad para probar sin buzón, y es también una llave: con ella
  /// cualquiera registra una cuenta con el correo de otra persona y la verifica
  /// sin tener acceso a ese buzón. Antes bastaba con que NODE_ENV no fuera
  /// 'production' —y un entorno de calidad casi nunca lo es—, así que ahora se
  /// pide encenderla a propósito.
  EXPONER_CODIGOS_DE_PRUEBA: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  SMTP_REMITENTE: z.string().default('AEMIPN <no-responder@aemipn.mx>'),
  /// Cuentas de prueba para entrar como jefe de area y ver los permisos
  /// desde dentro. El seed se niega a crearlas si NODE_ENV es production.
  SEED_CUENTAS_DEMO: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  SEED_DEMO_PASSWORD: z.string().min(8).default('Demo2026!'),
  /// Dominio propio para poder reconocerlas y borrarlas de un golpe.
  SEED_DEMO_DOMINIO: z.string().default('demo.aemipn.mx'),
  SEED_ADMIN_EMAIL: z.string().email().default('admin@aemipn.mx'),
  SEED_ADMIN_PASSWORD: z.string().min(8).default('Aemipn2026!'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('\n Configuracion invalida en apps/api/.env:\n');
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  console.error('');
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';

/**
 * ¿Se devuelven los códigos de verificación en la respuesta?
 *
 * Nunca en producción, por más que la variable diga que sí: una configuración
 * mal copiada no debe poder abrir esto.
 */
export const exponeCodigosDePrueba = env.EXPONER_CODIGOS_DE_PRUEBA && !isProd;
