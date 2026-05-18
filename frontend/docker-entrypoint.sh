#!/bin/sh
set -e
KEY="${VITE_YANDEX_MAPS_API_KEY:-}"
printf '%s\n' "window.__RUNTIME_CONFIG__ = { VITE_YANDEX_MAPS_API_KEY: \"${KEY}\" };" \
  > /usr/share/nginx/html/runtime-config.js
exec nginx -g 'daemon off;'
