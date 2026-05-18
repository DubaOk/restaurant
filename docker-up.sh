#!/usr/bin/env sh
set -e
cd "$(dirname "$0")"

ENV_FILE=""
if [ -f .env ]; then
  ENV_FILE=.env
elif [ -f .env.docker ]; then
  ENV_FILE=.env.docker
fi

if [ -n "$ENV_FILE" ]; then
  if ! grep -qE '^[[:space:]]*VITE_YANDEX_MAPS_API_KEY[[:space:]]*=[[:space:]]*[^[:space:]]' "$ENV_FILE" 2>/dev/null; then
    echo ""
    echo "WARNING: VITE_YANDEX_MAPS_API_KEY is empty in $ENV_FILE — Yandex Maps will not load."
    echo "Add your key from developer.tech.yandex.ru and run this script again."
    echo ""
  fi
  docker compose --env-file "$ENV_FILE" up -d --build
else
  docker compose up -d --build
fi

echo ""
echo "========================================"
echo "  https://localhost"
echo "  Admin: admin@restaurants.by / admin123"
[ -n "$ENV_FILE" ] && echo "  Env: $ENV_FILE"
echo "========================================"
echo ""
echo "Logs: docker compose logs -f"
echo "Stop: docker compose down"
