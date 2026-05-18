#!/usr/bin/env sh
# Самоподписанный сертификат для локального HTTPS (Docker proxy)
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SSL_DIR="$ROOT/nginx/ssl"
mkdir -p "$SSL_DIR"

openssl req -x509 -nodes -days 825 -newkey rsa:2048 \
  -keyout "$SSL_DIR/key.pem" \
  -out "$SSL_DIR/cert.pem" \
  -subj "/CN=localhost/O=Burmalda/C=BY" \
  -addext "subjectAltName=DNS:localhost,DNS:127.0.0.1,IP:127.0.0.1"

echo "Сертификаты созданы: $SSL_DIR"
