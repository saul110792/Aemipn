# PostgreSQL en este equipo

## Cómo quedó

| | |
|---|---|
| Servidor | PostgreSQL **18.6** (Postgres.app) |
| Puerto | **5433** — no el 5432 por omisión |
| Base | `aemipn` |
| Rol de la app | `aemipn` / contraseña `aemipn` |
| Superusuario del cluster | `postgres` |
| Data dir | `~/Library/Application Support/Postgres/var-18` |
| Log | `/tmp/pg-aemipn.log` |

```
DATABASE_URL="postgresql://aemipn:aemipn@localhost:5433/aemipn?schema=public"
```

## Por qué el puerto 5433

Este equipo ya tenía **otra instalación de PostgreSQL** antes de Postgres.app:

- `/Library/PostgreSQL/14` — instalador de EDB, corre como el usuario `postgres`
- `/Library/PgBouncer` — un pooler de conexiones, activo en el puerto 6432

Esa instalación dejó archivos en `/tmp` que le pertenecen al usuario `postgres`:

```
srwxrwxrwx  1 postgres  wheel  /tmp/.s.PGSQL.5432
-rw-------  1 postgres  wheel  /tmp/.s.PGSQL.5432.lock
```

Postgres.app corre como tu usuario, así que al intentar tomar el 5432 no puede abrir ese lock ajeno
y se apaga de inmediato:

```
FATAL:  could not open lock file "/tmp/.s.PGSQL.5432.lock": Permission denied
```

Borrar esos archivos requeriría `sudo` — y como `/tmp` tiene el *sticky bit*, solo su dueño puede
hacerlo. Además el conflicto volvería en cuanto la instalación de EDB arrancara otra vez. Mover
nuestro servidor al **5433** evita ambas cosas y no toca nada de la instalación existente.

La preferencia de Postgres.app quedó apuntando al 5433, así que si abres la app, administrará este
mismo servidor sin conflicto. Hay un respaldo de la configuración anterior en
`/tmp/postgresapp-backup.plist`.

## Arrancar y detener

El servidor sigue vivo mientras no reinicies el equipo. Para levantarlo de nuevo:

```bash
bash scripts/db-start.sh
```

O abre Postgres.app y pulsa **Start**. Para detenerlo a mano:

```bash
/Applications/Postgres.app/Contents/Versions/18/bin/pg_ctl \
  -D "$HOME/Library/Application Support/Postgres/var-18" stop
```

## Preparar la base desde cero

```bash
bash scripts/setup-db.sh
```

Arranca el servidor si hace falta, crea el rol y la base, aplica las migraciones y siembra los
datos. Es idempotente.

## Conectarse a mano

```bash
/Applications/Postgres.app/Contents/Versions/18/bin/psql -h 127.0.0.1 -p 5433 -U aemipn -d aemipn
```

O con la interfaz de Prisma:

```bash
npm run db:studio
```

## Notas

- Prisma 5.22 funciona sin problema contra PostgreSQL 18, ya verificado con migraciones y seed.
- Las Command Line Tools de Xcode están incompletas en este equipo (`/Library/Developer/CommandLineTools`
  existe pero no contiene `clang`). Eso rompe `python3` y cualquier compilación nativa. No afecta a
  este proyecto — Postgres.app trae binarios listos y las dependencias de Node que elegimos son JS
  puro (`bcryptjs` en vez de `bcrypt`, justamente por eso). Si algún día necesitas compilar algo:
  `xcode-select --install`.
