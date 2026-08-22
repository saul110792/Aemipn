#!/usr/bin/env bash
# Prepara la base de datos de AEMIPN.
# Idempotente: se puede correr las veces que haga falta.
#   bash scripts/setup-db.sh
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$RAIZ"

PUERTO=5433
PGBIN="/Applications/Postgres.app/Contents/Versions/18/bin"
DATA="$HOME/Library/Application Support/Postgres/var-18"

if [ ! -d "$PGBIN" ]; then
  echo "No encuentro Postgres.app en $PGBIN"
  exit 1
fi

# El servidor corre en 5433 porque el 5432 lo tiene apartado la instalacion
# EDB de /Library/PostgreSQL/14 (ver docs/postgres.md).
if ! nc -z -G 2 127.0.0.1 "$PUERTO" 2>/dev/null; then
  echo "==> Arrancando PostgreSQL en el puerto $PUERTO"
  "$PGBIN/pg_ctl" -D "$DATA" -o "-p $PUERTO" -l /tmp/pg-aemipn.log start
  sleep 3
fi

echo "==> Creando rol y base 'aemipn' si hacen falta"
"$PGBIN/psql" -h 127.0.0.1 -p "$PUERTO" -U postgres -d postgres -v ON_ERROR_STOP=1 <<'SQL'
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'aemipn') THEN
    CREATE ROLE aemipn LOGIN PASSWORD 'aemipn' CREATEDB;
  END IF;
END
$$;
SQL

"$PGBIN/psql" -h 127.0.0.1 -p "$PUERTO" -U postgres -d postgres -tAc \
  "SELECT 1 FROM pg_database WHERE datname='aemipn'" | grep -q 1 \
  || "$PGBIN/psql" -h 127.0.0.1 -p "$PUERTO" -U postgres -d postgres \
       -c "CREATE DATABASE aemipn OWNER aemipn;"

echo "==> Cargando Node 20"
export NVM_DIR="$HOME/.nvm"
# shellcheck disable=SC1091
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm use 20 >/dev/null

echo "==> Aplicando migraciones"
npm run db:migrate -w @aemipn/api

echo "==> Sembrando datos base"
npm run db:seed -w @aemipn/api

echo ""
echo "Listo. Arranca todo con:  npm run dev"
echo "Panel: http://localhost:5173/panel"
