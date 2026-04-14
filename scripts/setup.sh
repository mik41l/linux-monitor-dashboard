#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR"

if [ ! -f .env ]; then
  cp .env.example .env
  echo ".env created from .env.example"
fi

if [ ! -f docker/certs/server.crt ] || [ ! -f docker/certs/server.key ]; then
  mkdir -p docker/certs
  openssl req -x509 -nodes -newkey rsa:2048 \
    -keyout docker/certs/server.key \
    -out docker/certs/server.crt \
    -days 365 \
    -subj "/CN=server"
  echo "TLS certs generated under docker/certs"
fi

docker compose up -d --build

echo "Dashboard: http://localhost:${DASHBOARD_PORT:-3000}"
echo "API: http://localhost:${API_PORT:-5005}"
echo "TCP: localhost:${TCP_PORT:-9000}"
