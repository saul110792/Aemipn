import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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
});
