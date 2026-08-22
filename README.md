# AEMIPN

Plataforma de la **Asociación de Excursionismo y Montañismo del Instituto Politécnico Nacional**:
un sitio informativo público y un panel interno para llevar el control de miembros, áreas y cursos.

## Qué incluye

**Sitio público** (sin autenticación)
- Portada con las ocho áreas y la convocatoria vigente del CIM
- Ficha de cada área: descripción, mesa (jefe y tesorero) y cursos que imparte
- Página del CIM con fechas, cuota, requisitos y el desglose de salidas por área
- Catálogo de cursos
- Formulario "Únete" que genera una solicitud de ingreso

**Panel interno** (requiere sesión)
- Resumen: miembros por estado y por área, solicitudes pendientes, pagos pendientes, próximas salidas
- Miembros: alta, búsqueda, filtros, paginación, ficha completa con historial de cursos
- Asignación de miembros a áreas con rol (jefe de área / tesorero / miembro)
- Solicitudes de ingreso: aceptar (crea el miembro y lo asigna a sus áreas de interés) o rechazar
- Ediciones y CIM: roster con datos de emergencia a la mano, control de estado y de pago
- Atajo para generar de golpe una salida por cada área en una edición del CIM

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
- **PostgreSQL 14+** corriendo en local — ver [docs/postgres.md](docs/postgres.md)

## Puesta en marcha

```bash
nvm use                              # Node 20
npm install                          # dependencias de ambos workspaces
cp apps/api/.env.example apps/api/.env   # y ajusta DATABASE_URL
npm run db:migrate                   # crea las tablas
npm run db:seed                      # áreas, cursos, CIM y usuario admin
npm run dev                          # API en :4000 y web en :5173
```

Abre http://localhost:5173. El panel está en `/panel`; entra con el correo y la contraseña
que definiste en `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.

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
- [docs/n8n-fase-2.md](docs/n8n-fase-2.md) — qué automatizar y dónde engancharlo
