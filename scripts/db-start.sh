#!/usr/bin/env bash
# Arranca el PostgreSQL del proyecto (puerto 5433) si no esta corriendo.
set -euo pipefail
PGBIN="/Applications/Postgres.app/Contents/Versions/18/bin"
DATA="$HOME/Library/Application Support/Postgres/var-18"

if nc -z -G 2 127.0.0.1 5433 2>/dev/null; then
  echo "PostgreSQL ya responde en 5433."
else
  "$PGBIN/pg_ctl" -D "$DATA" -o "-p 5433" -l /tmp/pg-aemipn.log start
fi
