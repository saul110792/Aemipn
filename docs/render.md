# Publicar en Render

## Arquitectura

Tres recursos, definidos en [`render.yaml`](../render.yaml) en la raíz del repo:

| Recurso | Tipo | Qué sirve |
|---|---|---|
| `aemipn-db` | PostgreSQL administrado | La base de datos |
| `aemipn-api` | Web Service (Node) | `apps/api`, compilado a `dist/` |
| `aemipn-web` | Static Site | El build de `apps/web` (Vite) |

## Por qué el Static Site reescribe `/api/*` hacia la API

La cookie de refresh se guarda con `sameSite: 'lax'` (ver
[`auth.routes.ts`](../apps/api/src/routes/auth.routes.ts)), que es lo correcto para no exponerla
a sitios ajenos — pero **solo se reenvía si el navegador ve el sitio y la API como el mismo
origen**. Si quedaran en dos dominios `onrender.com` distintos, la sesión se caería cada 15
minutos (lo que dura el access token) porque el refresh nunca llegaría con la cookie.

`render.yaml` resuelve esto igual que el proxy de Vite en desarrollo: una regla de *rewrite* en
el Static Site hace que `/api/*` y `/uploads/*` se sirvan, para el navegador, desde el propio
dominio del sitio — Render reenvía la petición a `aemipn-api` por dentro, sin redirigir ni cambiar
el origen. El frontend no necesita saber en qué dominio vive la API, tal como en local.

## Puesta en marcha

1. **Conecta el repo.** En el dashboard de Render (o en la app Render.app): *New → Blueprint*,
   elige el repo `saul110792/Aemipn` y la rama `main`. Render lee `render.yaml` solo.
2. **Revisa el nombre de los servicios.** Si `aemipn-api` o `aemipn-web` ya están tomados, Render
   les pone un sufijo. Si eso pasa, edita en `render.yaml` las URLs de `CORS_ORIGIN`, `APP_URL` y
   los `destination` de las rutas de rewrite para que coincidan con el nombre real, y vuelve a
   desplegar.
3. **Llena las variables marcadas `sync: false`** cuando el Blueprint te las pida (o después, en
   *Environment* del servicio `aemipn-api`):

   | Variable | Valor |
   |---|---|
   | `SEED_ADMIN_EMAIL` | El correo del primer administrador |
   | `SEED_ADMIN_PASSWORD` | Su contraseña — cámbiala luego desde el panel |
   | `SMTP_URL` | `smtp://usuario:contrasena@host:puerto` de tu proveedor. Sin esto, los correos de verificación solo quedan en los logs del servicio |

   `JWT_ACCESS_SECRET` y `JWT_REFRESH_SECRET` los genera Render solos (`generateValue: true`) —
   no hace falta tocarlos.
4. **Siembra los datos una sola vez**, desde la pestaña *Shell* de `aemipn-api` una vez que el
   primer deploy terminó:

   ```bash
   npm run db:seed -w @aemipn/api
   ```

   Es idempotente — correrlo de más no duplica nada. **No** actives `SEED_CUENTAS_DEMO` en
   producción: el propio seed se niega a crear las cuentas de prueba si `NODE_ENV=production`,
   así que ni hace falta apagarla a mano.

## Cada deploy siguiente

`startCommand` ya encadena `prisma migrate deploy` antes de arrancar el servidor
(`npm run db:deploy -w @aemipn/api && npm start -w @aemipn/api`), así que cualquier migración
nueva se aplica sola. No hace falta entrar al Shell salvo para el seed inicial o una corrección
puntual.

## Pendiente: las imágenes subidas no persisten

`apps/api/uploads/` vive en el disco del Web Service, que en Render es **efímero**: cualquier
imagen subida desde *Textos e imágenes* o el carrusel de áreas se pierde en el próximo deploy o
reinicio. Hoy la carpeta está vacía, así que no urge, pero antes de subir fotos reales hay que
resolverlo de una de dos formas:

- Agregar un [Disco persistente](https://render.com/docs/disks) a `aemipn-api` montado en
  `/opt/render/project/src/apps/api/uploads` (plan de pago, y limita el servicio a una sola
  instancia).
- Cambiar `media.routes.ts` para subir a un bucket (S3, R2, Cloudinary) en vez de disco local —
  cambio de código, no solo de configuración.

## Plan gratuito: qué esperar

Con `plan: free` en la API, el servicio se duerme tras ~15 minutos sin tráfico y la primera
petición después tarda en despertar (30–60 s). Sube a un plan pago cuando eso deje de ser
aceptable. La base de datos gratuita de Render además expira a los 90 días si no se actualiza a
un plan pago — para un ambiente que va a durar, conviene planearlo desde ahora.
