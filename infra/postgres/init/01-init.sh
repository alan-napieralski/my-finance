#!/usr/bin/env bash
set -euo pipefail

# This runs only on first init of the Postgres data volume.
# It creates the DB + role for the my-finance app.

: "${POSTGRES_SUPERUSER:=postgres}"
: "${APP_DB_NAME:=my_finance}"
: "${APP_DB_USER:=my_finance_app}"
: "${APP_DB_PASSWORD:?APP_DB_PASSWORD is required}"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<EOSQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${APP_DB_USER}') THEN
    CREATE ROLE ${APP_DB_USER} LOGIN PASSWORD '${APP_DB_PASSWORD}';
  END IF;
END
\$\$;

-- Create DB outside of DO blocks (CREATE DATABASE can't run inside a transaction)
SELECT 'CREATE DATABASE ${APP_DB_NAME} OWNER ${APP_DB_USER}'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = '${APP_DB_NAME}')\gexec
EOSQL

# Ensure pgcrypto exists in the app DB (migrations also create this, but this avoids surprises)
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$APP_DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;" >/dev/null
