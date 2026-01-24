# Infra (Docker Compose)
This folder contains Compose files intended for an always-on host (e.g. DigitalOcean Droplet), while still being usable locally.

This repo no longer runs n8n as part of its infra stack (n8n is expected to run separately).

## Files
- `compose.yml`: Postgres + my-finance app

## Quick start (local)
1) Create `infra/.env` from `infra/.env.example`.
2) Start the stack:
   - `docker compose -f infra/compose.yml up -d`

## Database migrations
The app expects the SQL migrations in `server/db/migrations/*` to be applied to the app DB.

If you are running the stack via Docker Compose, you can use:
- `infra/scripts/app-migrate.sh`

This applies all `*.sql` files in filename order to `${APP_DB_NAME}`.
