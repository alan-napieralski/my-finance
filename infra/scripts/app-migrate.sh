#!/usr/bin/env bash
set -euo pipefail

# Applies all SQL migrations under server/db/migrations to the app database.
# Requires the stack to be running.

COMPOSE=(docker compose -f infra/compose.yml)

: "${POSTGRES_SUPERUSER:=postgres}"
: "${APP_DB_NAME:=my_finance}"

# Ensure postgres is reachable
"${COMPOSE[@]}" exec -T postgres pg_isready -U "$POSTGRES_SUPERUSER" -d "$APP_DB_NAME" >/dev/null

# Run in filename order. Note: /migrations is a container path; glob on host instead.
shopt -s nullglob
migrations=(server/db/migrations/*.sql)

if [ ${#migrations[@]} -eq 0 ]; then
  echo "[migrate] no migrations found under server/db/migrations"
  exit 1
fi

for f in "${migrations[@]}"; do
  base=$(basename "$f")
  echo "[migrate] applying $base"
  "${COMPOSE[@]}" exec -T postgres psql -v ON_ERROR_STOP=1 -U "$POSTGRES_SUPERUSER" -d "$APP_DB_NAME" -f "/migrations/$base" >/dev/null
done

echo "[migrate] done"
