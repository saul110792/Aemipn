/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';

// El cascaron de la app (JS/CSS/imagenes de build): lo genera vite-plugin-pwa.
precacheAndRoute(self.__WB_MANIFEST);

// Cualquier navegacion (recargar, abrir la app desde el icono) cae al shell
// de React Router, salvo lo que de plano no es una pantalla de la SPA.
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('/index.html'), {
    denylist: [/^\/api/, /^\/uploads/],
  }),
);

// El calendario y los eventos, con red primero: si hay señal siempre se ve
// lo último, y sin ella se cae a la última copia buena — útil literalmente
// en la montaña. El resto de /api sigue sin cachearse (ver vite.config.ts):
// la ficha de un miembro o el padrón no deben poder verse offline con datos
// viejos.
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/calendario') || url.pathname.startsWith('/api/events'),
  new NetworkFirst({ cacheName: 'agenda', networkTimeoutSeconds: 4 }),
);

self.addEventListener('push', (event) => {
  const datos = event.data?.json() ?? {};
  const titulo = datos.titulo ?? 'AEMIPN';

  event.waitUntil(
    self.registration.showNotification(titulo, {
      body: datos.cuerpo,
      icon: '/iconos/icon-192.png',
      badge: '/iconos/icon-192.png',
      data: { url: datos.url ?? '/panel/calendario' },
    }),
  );
});

// Un clic en la notificacion trae al frente una pestaña que ya esté en el
// sitio en vez de abrir otra, y si no hay ninguna, abre una nueva.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const destino = new URL(event.notification.data?.url ?? '/panel/calendario', self.location.origin).href;

  event.waitUntil(
    (async () => {
      const clientes = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const abierto = clientes.find((c) => c.url.startsWith(self.location.origin));
      if (abierto) {
        await abierto.focus();
        if ('navigate' in abierto) await (abierto as WindowClient).navigate(destino);
      } else {
        await self.clients.openWindow(destino);
      }
    })(),
  );
});

self.skipWaiting();
self.addEventListener('activate', () => self.clients.claim());
