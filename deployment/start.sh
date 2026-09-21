#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="/var/www/delevry-dz/shared/.env"

cd "$APP_DIR"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  source "$ENV_FILE"
  set +a
else
  echo "ERROR: production environment file not found: $ENV_FILE" >&2
  exit 1
fi

export NODE_ENV=production
export HOSTNAME="${HOSTNAME:-127.0.0.1}"
export PORT="${PORT:-3000}"

if [[ ! -f "$APP_DIR/.next/standalone/server.js" ]]; then
  echo "ERROR: .next/standalone/server.js is missing. Build the production artifact first." >&2
  exit 1
fi

exec node "$APP_DIR/.next/standalone/server.js"
