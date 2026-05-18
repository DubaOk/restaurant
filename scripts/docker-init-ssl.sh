#!/bin/sh
set -e
mkdir -p /ssl
if [ -f /ssl/cert.pem ] && [ -f /ssl/key.pem ]; then
  echo "[init-ssl] Certificates already exist."
  exit 0
fi
echo "[init-ssl] Generating self-signed certificate for localhost..."
openssl req -x509 -nodes -days 825 -newkey rsa:2048 \
  -keyout /ssl/key.pem \
  -out /ssl/cert.pem \
  -subj "/CN=localhost/O=Burmalda/C=BY" \
  -addext "subjectAltName=DNS:localhost,DNS:127.0.0.1,IP:127.0.0.1"
echo "[init-ssl] Done."
