#!/usr/bin/env bash
set -euo pipefail
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${DELEVRY_ENV_FILE:-/var/www/delevry-dz/shared/.env}"
cd "$APP_DIR"
if [[ -f "$ENV_FILE" ]]; then set -a; source "$ENV_FILE"; set +a; else echo "ERROR: production environment file not found: $ENV_FILE" >&2; exit 1; fi
export NODE_ENV=production
export HOSTNAME="${HOSTNAME:-127.0.0.1}"
export PORT="${PORT:-3000}"
exec node "$APP_DIR/.next/standalone/server.js"
