import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Un service worker propio (src/sw.ts) en vez de que Workbox lo genere
      // entero: hace falta para recibir push y cachear el calendario aparte
      // del resto de /api, cosas que el modo generado no permite tocar.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico,webmanifest}'],
      },
      registerType: 'autoUpdate',
      includeAssets: ['logo-ipn.svg', 'logo-ipn-blanco.svg', 'escudo-aemipn.png'],
      manifest: {
        name: 'AEMIPN — Excursionismo y Montañismo IPN',
        short_name: 'AEMIPN',
        description: 'Asociación de Excursionismo y Montañismo del IPN',
        lang: 'es-MX',
        // La app instalada abre directo al calendario, no a la portada
        // informativa: para quien la instala, lo que importa es lo operativo.
        // Sin sesión, /panel redirige solo a /login.
        start_url: '/panel/calendario',
        scope: '/',
        display: 'standalone',
        background_color: '#611232',
        theme_color: '#611232',
        icons: [
          { src: '/iconos/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/iconos/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/iconos/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/iconos/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    // El front llama a rutas /api/* y Vite las reenvia a la API.
    // Asi no hay CORS en desarrollo y el codigo no necesita saber el host.
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  // `vite preview` sirve el build de produccion (incluye el service worker
  // real, que `vite dev` no genera) — necesita el mismo reenvio que arriba.
  preview: {
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
