/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Correo para el acceso automático en desarrollo. Ver apps/web/.env.example. */
  readonly VITE_AUTOLOGIN_EMAIL?: string;
  /** Contraseña del acceso automático. Nunca uses aquí una que sirva en producción. */
  readonly VITE_AUTOLOGIN_PASSWORD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
