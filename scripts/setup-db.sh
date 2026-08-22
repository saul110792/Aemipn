#!/usr/bin/env bash
# Prepara la base de datos de AEMIPN una vez que Postgres esta corriendo.
# Uso:  bash scripts/setup-db.sh
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$RAIZ"

PGAPP="/Applications/Postgres.app/Contents/Versions/latest/bin"
[ -d "$PGAPP" ] && export PATH="$PGAPP:$PATH"

if ! command -v psql >/dev/null 2>&1; then
  echo "No encuentro psql."
  echo "Instala Postgres.app desde https://postgresapp.com, abrela y pulsa Initialize."
  exit 1
fi

if ! psql -d postgres -c 'select 1' >/dev/null 2>&1; then
  echo "Postgres no responde en localhost:5432."
  echo "Abre Postgres.app y asegurate de que el servidor este iniciado."
  exit 1
fi

echo "==> Creando usuario y base 'aemipn'"
psql -d postgres -v ON_ERROR_STOP=1 <<'SQL'
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'aemipn') THEN
    CREATE ROLE aemipn LOGIN PASSWORD 'aemipn' CREATEDB;
  END IF;
END
$$;
SQL

psql -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='aemipn'" | grep -q 1 \
  || psql -d postgres -c "CREATE DATABASE aemipn OWNER aemipn;"

echo "==> Cargando Node 20"
export NVM_DIR="$HOME/.nvm"
# shellcheck disable=SC1091
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm use 20 >/dev/null

echo "==> Aplicando migraciones"
npm run db:migrate -- --name inicial

echo "==> Sembrando datos base"
npm run db:seed

echo ""
echo "Listo. Arranca todo con:  npm run dev"
echo "Panel: http://localhost:5173/panel"
