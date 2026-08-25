# API

Base: `http://localhost:4000/api` — en desarrollo el frontend la alcanza como `/api` gracias al
proxy de Vite.

## Autenticación

Access token de 15 minutos que el frontend guarda **en memoria** (no en `localStorage`, para que un
XSS no pueda leerlo) y refresh token de 30 días en **cookie httpOnly**. El cliente HTTP renueva el
access token solo cuando recibe un 401, y reintenta la petición una vez.

Las rutas protegidas esperan `Authorization: Bearer <accessToken>`.

| Método | Ruta | Acceso | Qué hace |
|---|---|---|---|
| POST | `/auth/login` | público | Inicia sesión. Máx. 10 intentos por IP cada 15 min. |
| POST | `/auth/refresh` | cookie | Nuevo access token. |
| POST | `/auth/logout` | pública | Borra la cookie de refresh. |
| GET | `/auth/me` | sesión | Usuario actual con sus áreas. |
| POST | `/auth/change-password` | sesión | Cambia la contraseña. |

## Público (sin sesión)

| Método | Ruta | Qué devuelve |
|---|---|---|
| GET | `/public/areas` | Áreas activas con conteo de miembros. |
| GET | `/public/areas/:slug` | Ficha del área, sus cursos y su mesa. |
| GET | `/public/cim` | Convocatorias del CIM abiertas o en curso, con sus salidas. |
| GET | `/public/cursos` | Catálogo con ediciones abiertas. |
| POST | `/public/solicitudes` | Recibe el formulario "Únete". Máx. 5 por hora por IP. |
| GET | `/public/eventos?areaId=&limite=` | Eventos **públicos** y publicados que aún no terminan. |

## Panel

Todas requieren sesión. `ADMIN`/`STAFF` donde se indica.

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/dashboard` | ADMIN, STAFF |
| GET | `/members?q=&status=&areaId=&page=&perPage=` | sesión |
| GET | `/members/:id` | sesión (un `MIEMBRO` solo ve su propia ficha) |
| POST | `/members` | ADMIN, STAFF |
| PATCH | `/members/:id` | ADMIN, STAFF |
| DELETE | `/members/:id` | ADMIN — baja lógica |
| POST | `/members/:id/areas` | ADMIN, STAFF — asigna área y rol |
| DELETE | `/members/:id/areas/:areaId` | ADMIN, STAFF |
| POST | `/members/:id/user` | ADMIN — da acceso al panel |
| GET | `/areas` · `/areas/:areaId` | sesión |
| POST | `/areas` | ADMIN |
| PATCH | `/areas/:areaId` | ADMIN, STAFF **o el jefe de esa área** |
| GET | `/courses` · `/courses/:id` | sesión |
| POST/PATCH | `/courses` | ADMIN, STAFF |
| GET | `/editions` · `/editions/:id` | sesión |
| POST/PATCH | `/editions` | ADMIN, STAFF |
| POST | `/editions/:id/activities` | ADMIN, STAFF |
| POST | `/editions/:id/activities/generar-cim` | ADMIN, STAFF |
| GET | `/enrollments?editionId=&memberId=&status=` | sesión |
| POST | `/enrollments` | ADMIN, STAFF — valida cupo y duplicados |
| PATCH | `/enrollments/:id` | ADMIN, STAFF |
| GET | `/applications?status=` | ADMIN, STAFF |
| POST | `/applications/:id/aceptar` | ADMIN, STAFF |
| POST | `/applications/:id/rechazar` | ADMIN, STAFF |
| GET | `/events?areaId=&incluirPasados=` | sesión — filtrado por visibilidad |
| GET | `/events/:id` | sesión — 403 si es privado de un área ajena |
| POST/PATCH/DELETE | `/events` | ADMIN, STAFF **o jefe/tesorero del área del evento** |
| GET | `/notificaciones` | sesión — devuelve solo lo que quien pregunta puede resolver |
| GET | `/calendario?desde=&hasta=` | sesión — ver la nota de planeación abajo |
| GET | `/media` | ADMIN, STAFF |
| POST | `/media` | ADMIN, STAFF — `multipart/form-data`, campo `archivo` |
| PATCH | `/media/:id` | ADMIN, STAFF — edita el texto alternativo |
| DELETE | `/media/:id` | ADMIN — borra el registro y el archivo |

## Visibilidad de eventos

Cada evento declara quién puede verlo, y la API lo hace cumplir en los tres caminos
(listado, detalle por id y endpoint público):

| Visibilidad | Quién lo ve |
|---|---|
| `PUBLICO` | Cualquier visitante. Es lo único que sale por `/public/eventos`. |
| `MIEMBROS` | Cualquier miembro con sesión iniciada. |
| `AREA` | Solo los miembros activos del área del evento. Un miembro de otra área recibe 403 aunque tenga el id. |

ADMIN y STAFF ven todo, publicado o no.

## Notificaciones

`GET /api/notificaciones` reúne lo que espera acción y devuelve `{ total, solicitudes, pendientes[] }`.

Cada pendiente trae `cantidad`, `titulo`, `detalle` y la `ruta` donde se resuelve, así que el
frontend no necesita saber qué significa cada tipo.

La lista está filtrada por lo que quien pregunta puede atender: las solicitudes de ingreso las
revisa la mesa directiva, así que a un jefe de área no se le anuncian — a él solo le aparecen
los eventos de su área sin publicar. **Una notificación que no se puede atender es solo ruido.**

El frontend la consulta cada minuto y al volver a la pestaña, y la invalida en cuanto se acepta
o rechaza una solicitud, para que el contador baje sin esperar al siguiente sondeo.

## Calendario

`GET /api/calendario` reúne en una sola lista las sesiones de cada edición, la duración completa
de las ediciones abiertas y los eventos, cada uno con el color de su área.

La regla de visibilidad tiene **una excepción deliberada** al aislamiento entre áreas: quien
encabeza un área —y quien coordina el CIM— ve también **los cursos de las demás**, marcados con
`ajeno: true`. Sin eso no se puede programar sin encimarse, que es justo para lo que sirve la
vista. La excepción alcanza solo a los cursos: los **eventos privados de otra área no se filtran**,
esos siguen la visibilidad de siempre.

Un miembro sin cargo ve lo de sus áreas más lo público, y nada de los cursos ajenos.

El mismo endpoint sirve a las dos escalas: la vista de mes pide las seis semanas visibles y la
de año pide del 1 de enero al 31 de diciembre.

## Archivos subidos

`POST /api/media` acepta un archivo por petición en el campo `archivo`. Solo JPG, PNG, WebP
y AVIF, hasta 5 MB. El nombre en disco se genera con un aleatorio — nunca se usa el del
usuario — y el archivo se sirve en `/uploads/<nombre>` con `X-Content-Type-Options: nosniff`
y sin listado de directorio.

`PATCH /areas/:areaId` usa `requireAreaRole`, que deja pasar a quien sea jefe **de esa área en
particular** aunque no sea admin global. Es el mecanismo para delegar sin repartir permisos totales.

## Errores

Siempre JSON con `error`, y `detalles` cuando la validación de Zod falló campo por campo:

```json
{
  "error": "Datos invalidos",
  "detalles": [{ "campo": "email", "mensaje": "Correo invalido" }]
}
```

| Código | Cuándo |
|---|---|
| 400 | Datos inválidos |
| 401 | Sin token, token vencido o credenciales incorrectas |
| 403 | Autenticado pero sin permiso |
| 404 | No existe |
| 409 | Duplicado, cupo lleno o conflicto de estado |
| 429 | Límite de peticiones |
| 500 | Error interno (incluye `detalle` solo fuera de producción) |
