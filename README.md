# AEMIPN

Plataforma de la **Asociación de Excursionismo y Montañismo del Instituto Politécnico Nacional**:
un sitio informativo público y un panel interno para llevar el control de miembros, áreas y cursos.

## Qué incluye

**Sitio público** (sin autenticación)
- Portada con las ocho áreas y la convocatoria vigente del CIM
- Ficha de cada área: descripción, mesa (jefe y tesorero) y cursos que imparte
- **Carrusel de áreas** con la foto de la actividad; las que aún no tienen foto muestran un panel ilustrado con su color y su icono
- **Eventos**: próximos cursos, talleres y salidas, con fecha, área, y lugar o liga de videoconferencia según la modalidad
- Página del CIM con fechas, cuota, requisitos y el desglose de salidas por área
- Catálogo de cursos
- **Registro de miembros** con confirmación de correo (liga o código de seis caracteres)

**Panel interno** (requiere sesión)
- Resumen: miembros por estado y por área, solicitudes pendientes, pagos pendientes, próximas salidas
- **Calendario**: dos escalas. Por **mes**, rejilla con barras del color de cada área que abarcan lo que dura la actividad. Por **año**, línea de tiempo con una fila por área, donde los traslapes se ven de un vistazo. En el teléfono el mes se vuelve agenda y el año se desplaza de lado.
- **Notificaciones**: contador junto a *Solicitudes* y campana en la barra con lo que espera acción
- **Mi expediente**: NSS, contacto de emergencia, dirección, lesiones, tipo de sangre por catálogo, alergias como lista con sugerencias, y los cursos que ha tomado
- **Validación de cursos**: el jefe de cada área aprueba o rechaza lo que su gente declara. Aprobar el **curso base** integra al área; un taller queda en el historial sin dar acceso. Ambas partes pueden corregir la generación: el solicitante mientras esté pendiente, el área en cualquier momento
- Miembros: alta, búsqueda, filtros, paginación, ficha completa con historial de cursos
- Asignación de miembros a áreas con rol (jefe de área / tesorero / miembro)
- Resumen por área para su jefe, más las estadísticas del CIM (de ahí salen los nuevos)
- Historial de jefaturas: quién encabezó cada área, entre qué fechas y qué cursos se dieron
- Pasar lista por sesión, conservando la hora real cuando se tomó sin señal
- Sin precios: la participación es voluntaria
- Requisitos entre cursos: Alta Montaña exige el CIM y el curso básico de media montaña
- Solicitudes de ingreso: aceptar (crea el miembro y lo asigna a sus áreas de interés) o rechazar
- Ediciones y CIM: roster con datos de emergencia a la mano, control de estado y de pago. Al evaluar se distingue **aprobó, reprobó y desertó**; una edición sin inscritos se borra y una que ya arrancó se cancela con motivo
- Atajo para generar de golpe una salida por cada área en una edición del CIM
- **Catálogo**: un curso por área más sus talleres, con código sugerido a partir del nombre
- **Áreas**: edición de sus códigos, con aviso de duplicados y de formato
- **Eventos**: alta con modalidad presencial / en línea / híbrida, y control de quién lo ve — público, solo miembros, o privado del área
- **Textos e imágenes**: edita lo que ve el público de cada área y sube fotos al carrusel, sin tocar código

## Cuentas de prueba

Para recorrer el sistema desde cada rol en vez de deducirlo del código, pon en `apps/api/.env`:

```
SEED_CUENTAS_DEMO="true"
SEED_DEMO_PASSWORD="Demo2026!"
SEED_DEMO_DOMINIO="demo.aemipn.mx"
```

y corre `npm run db:seed`. Crea doce cuentas que comparten contraseña:

| Cuenta | Para probar |
|---|---|
| `jefe.<área>@demo.aemipn.mx` (8) | Un jefe por área, con su curso base acreditado |
| `tesorero.alta-montana@…` | Ve el padrón de su área pero no valida cursos |
| `exjefe.escalada-en-roca@…` | Fue jefe y ya no: aparece en el historial de Escalada |
| `miembro.escalada-en-roca@…` | Miembro raso: solo su área, sin padrón |
| `jefe.cim@…` | Coordina el CIM; no ve las áreas |
| `recien.registrado@…` | Sin curso aprobado: no pertenece a ninguna área |

Los jefes se crean con el curso base del área **aprobado**, porque esa es la condición para ser
titular: las cuentas de prueba cumplen la misma regla que las reales.

> **El seed se niega a crearlas si `NODE_ENV=production`**, aunque el interruptor esté en true.
> Viven bajo su propio dominio para poder borrarlas de un golpe:
> `delete from members where email like '%@demo.aemipn.mx';`

## Correo

El registro manda una liga y un código de confirmación. Sin `SMTP_URL` configurado, el mensaje
**se imprime en la consola del servidor** — suficiente para desarrollar, y visible en la salida de
`npm run dev`. Con `SMTP_URL` se envía de verdad, sin cambiar nada más.

## Diseño móvil

El sitio público está pensado para el teléfono: menú desplegable, botones de ancho completo,
objetivos táctiles de 44 px y el carrusel se controla deslizando. El panel de gestión está
orientado a escritorio — funciona en el teléfono, con el menú lateral desplazable y las tablas
con desplazamiento propio, y avisa de que rinde mejor en pantalla grande.

El escudo del IPN ya está integrado en el pie. Falta el de la asociación en la barra: ver
[apps/web/public/LEEME.md](apps/web/public/LEEME.md).

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 18, Vite 6, React Router 6, TanStack Query 5, React Hook Form |
| Backend | Node 20, Express 4, TypeScript |
| Base de datos | PostgreSQL vía Prisma 5 |
| Autenticación | JWT propio (access en memoria + refresh en cookie httpOnly), bcrypt |
| Automatizaciones | n8n — **fase 2**, aún no integrado |

## Requisitos

- **Node 20+** (el proyecto trae `.nvmrc`; con `nvm` basta `nvm use`)
- **PostgreSQL** — ya configurado en este equipo: Postgres.app 18.6 en el puerto **5433**.
  El porqué del 5433 y cómo arrancarlo está en [docs/postgres.md](docs/postgres.md).

## Puesta en marcha

Ya está todo instalado y sembrado. Para trabajar:

```bash
nvm use && npm run dev
```

Si el equipo se reinició y Postgres no responde:

```bash
bash scripts/db-start.sh
```

Desde cero (equipo nuevo o base borrada):

```bash
nvm use
npm install
cp apps/api/.env.example apps/api/.env
bash scripts/setup-db.sh             # arranca Postgres, crea la base, migra y siembra
npm run dev                          # API en :4000 y web en :5173
```

Abre http://localhost:5173. El panel está en `/panel`; entra con el correo y la contraseña
de `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` en `apps/api/.env`
(por omisión `admin@aemipn.mx` / `Aemipn2026!` — **cámbiala**).

## Entrar sin escribir el login (solo desarrollo)

Copia `apps/web/.env.example` a `apps/web/.env.local` y llena:

```
VITE_AUTOLOGIN_EMAIL="admin@aemipn.mx"
VITE_AUTOLOGIN_PASSWORD="Aemipn2026!"
```

Con eso, abrir cualquier página del panel inicia sesión sola y avisa en la consola.
Pulsar **Salir** cierra de verdad y no vuelve a entrar al recargar; para reactivarlo,
abre una pestaña nueva.

> **Estas variables no son secretas.** Todo lo que empieza con `VITE_` se empaqueta en
> el JavaScript del navegador. Aquí no hay riesgo porque el bloque que las lee está
> encerrado en `import.meta.env.DEV`, que Vite convierte en `false` al compilar: el
> empaquetador borra el código entero y el bundle de producción no contiene ni las
> credenciales ni el mecanismo. Aun así, **nunca pongas ahí una contraseña que también
> sirva en producción**. `.env.local` está ignorado por git.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Levanta API y frontend a la vez |
| `npm run dev:api` / `npm run dev:web` | Solo uno de los dos |
| `npm run build` | Compila ambos para producción |
| `npm run db:migrate` | Aplica migraciones (y crea una nueva si cambió el schema) |
| `npm run db:seed` | Carga los datos base (idempotente) |
| `npm run db:studio` | Abre Prisma Studio para ver y editar la base a mano |
| `npm run db:reset` | Borra y recrea la base. **Destructivo.** |

## Estructura

```
aemipn/
├── apps/
│   ├── api/                  Backend
│   │   ├── prisma/
│   │   │   ├── schema.prisma Modelo de datos
│   │   │   └── seed.ts       Áreas, cursos, CIM, admin
│   │   └── src/
│   │       ├── lib/          env, prisma, errores, tokens
│   │       ├── middleware/   auth, validación, errores
│   │       ├── routes/       Un archivo por recurso
│   │       ├── app.ts        Ensamblado de Express
│   │       └── server.ts     Arranque y apagado limpio
│   └── web/                  Frontend
│       └── src/
│           ├── layouts/      Sitio público y panel
│           ├── pages/        Páginas públicas
│           ├── pages/panel/  Páginas del panel
│           ├── components/   Estados de carga, error, insignias
│           └── lib/          Cliente HTTP, auth, tipos, formato
└── docs/                     Modelo de datos, API, Postgres, n8n
```

En desarrollo, Vite hace proxy de `/api/*` hacia `http://localhost:4000`, así que el frontend
nunca necesita saber en qué host vive la API y no hay CORS de por medio.

## Documentación

- [docs/modelo-de-datos.md](docs/modelo-de-datos.md) — entidades y por qué están así
- [docs/api.md](docs/api.md) — todos los endpoints
- [docs/postgres.md](docs/postgres.md) — instalar PostgreSQL en este equipo
- [docs/identidad.md](docs/identidad.md) — paleta del IPN, tipografía, iconos y logotipo
- [docs/n8n-fase-2.md](docs/n8n-fase-2.md) — qué automatizar y dónde engancharlo
- [docs/render.md](docs/render.md) — publicar en Render con `render.yaml`
- [docs/correo.md](docs/correo.md) — los tres motores de correo (Brevo, SMTP, consola) y por qué

### "does not provide an export named 'constants'"

Es Node viejo, aunque el mensaje no lo diga. `nvm` es de bash y **en fish no se
carga solo**, así que la terminal toma el Node del sistema:

```bash
fish_add_path --prepend ~/.nvm/versions/node/v20.20.2/bin
```

`npm run dev` y `npm run build` ya comprueban la versión antes de arrancar y lo
dicen con todas sus letras.

### "does not provide an export named 'constants'"

Es Node viejo, aunque el mensaje no lo diga. `nvm` es de bash y **en fish no se
carga solo**, así que la terminal toma el Node del sistema:

```bash
fish_add_path --prepend ~/.nvm/versions/node/v20.20.2/bin
```

`npm run dev` y `npm run build` ya comprueban la versión antes de arrancar y lo
dicen con todas sus letras.

### Si desaparecen los `.env`

Están en `.gitignore`, así que **git no los restaura**: un `git clean -fdx` o un
"descartar todo lo no rastreado" se los lleva junto con `node_modules`. Los
`.env.example` sí están versionados y sirven de plantilla:

```bash
cp apps/api/.env.example apps/api/.env && cp apps/web/.env.example apps/web/.env.local
```

Luego genera secretos nuevos con `openssl rand -base64 48` y pon
`SEED_CUENTAS_DEMO=true`. Los datos no se pierden: viven en Postgres, no en la
carpeta. Y para limpiar sin llevarse los `.env`, `git clean -fd` **sin la `-x`**.

### Corregir áreas capturadas por error

Relevar a alguien desde el panel es **baja lógica**: conserva el registro porque un jefe saliente
sigue perteneciendo al área. Cuando lo que hubo fue un error de captura, ese rastro estorba —y las
declaraciones de curso base aprobadas siguen diciendo que la persona pertenece al área.

```bash
cd apps/api && npx tsx scripts/quitar-areas.ts alguien@ejemplo.mx
```

Sin `--aplicar` solo enseña qué se llevaría. Agrega `--aplicar` para borrar las membresías y
`--con-cursos` para llevarte también las declaraciones que las otorgan.
