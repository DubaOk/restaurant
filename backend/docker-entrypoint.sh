#!/bin/sh
set -e

echo "[entrypoint] Prisma: applying database schema..."
npx prisma db push --accept-data-loss

if [ "${ENSURE_ADMIN:-true}" = "true" ]; then
  echo "[entrypoint] Ensuring admin account..."
  node scripts/ensure-admin.js || true
fi

if [ "${SEED_DEMO:-true}" = "true" ]; then
  echo "[entrypoint] Demo restaurants seed..."
  node prisma/seed.js || true
fi

echo "[entrypoint] Starting API..."
exec node src/app.js
