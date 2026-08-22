# PostgreSQL en este equipo

## El problema

Este Mac corre **macOS 12 Monterey**. Homebrew dejó de publicar binarios precompilados (*bottles*)
para esa versión, así que `brew install postgresql@XX` intenta **compilar desde el código fuente**.
Además, las Command Line Tools de Xcode están incompletas: el directorio existe pero `clang` no
está, así que ni siquiera puede compilar.

```
$ xcode-select -p
/Library/Developer/CommandLineTools
$ ls /Library/Developer/CommandLineTools/usr/bin/clang
No such file or directory
```

Por eso `brew install postgresql` falló con
`Error: Xcode alone is not sufficient on Monterey`.

## Opción A — Postgres.app (recomendada)

Binarios ya compilados dentro de una app de macOS. Sin Homebrew, sin compilar, sin Command Line
Tools. Es la ruta más corta en Monterey.

1. Descarga la versión de <https://postgresapp.com> (elige un build que soporte macOS 12).
2. Arrástrala a `/Applications` y ábrela.
3. Pulsa **Initialize**. Queda escuchando en `localhost:5432`.
4. Agrega sus binarios al PATH (fish):

   ```fish
   fish_add_path /Applications/Postgres.app/Contents/Versions/latest/bin
   ```

5. Crea la base y el usuario:

   ```bash
   createuser -s aemipn && createdb -O aemipn aemipn && psql -d aemipn -c "ALTER USER aemipn WITH PASSWORD 'aemipn';"
   ```

## Opción B — Command Line Tools + Homebrew

Más largo, y la compilación puede tardar entre 20 y 40 minutos o fallar en un sistema que Homebrew
ya no soporta.

```bash
xcode-select --install
```

Abre un diálogo del sistema; acéptalo y espera a que termine. Después:

```bash
brew install postgresql@17
brew services start postgresql@17
```

## Opción C — Postgres administrado (sin instalar nada)

Si prefieres no pelear con el sistema, un Postgres gratuito en la nube (Supabase o Neon) funciona
sin cambiar una línea de código: solo cambia `DATABASE_URL` en `apps/api/.env`. La contra es que
necesitas conexión a internet para desarrollar.

## Verificar y arrancar

Con Postgres corriendo, sea cual sea la opción:

```bash
psql -d aemipn -c "select version();"
```

Ajusta `DATABASE_URL` en `apps/api/.env` si tu usuario o contraseña son distintos:

```
DATABASE_URL="postgresql://aemipn:aemipn@localhost:5432/aemipn?schema=public"
```

Y entonces:

```bash
npm run db:migrate
npm run db:seed
```

`db:migrate` crea las tablas a partir de `apps/api/prisma/schema.prisma`. `db:seed` carga las ocho
áreas, los cursos técnicos, el curso CIM con una edición de ejemplo y el usuario administrador.
Es idempotente: puedes correrlo las veces que quieras.
