#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

: "${DATABASE_URL:?DATABASE_URL is required}"
: "${AUTH_SECRET:?AUTH_SECRET is required}"

if (( ${#AUTH_SECRET} < 32 )); then
  echo "ERROR: AUTH_SECRET must contain at least 32 characters." >&2
  exit 1
fi

export NODE_ENV=production
export PORT="${PORT:-3000}"
export HOSTNAME="${HOSTNAME:-127.0.0.1}"

if [[ ! -f "$ROOT_DIR/.next/BUILD_ID" || ! -f "$ROOT_DIR/.next/standalone/server.js" ]]; then
  echo "Production build missing; preparing application..."

  npm install --no-audit --no-fund
  npx prisma generate
  npx prisma migrate deploy
  npm run build

  mkdir -p "$ROOT_DIR/.next/standalone/.next"
  if [[ -d "$ROOT_DIR/public" ]]; then
    rm -rf "$ROOT_DIR/.next/standalone/public"
    cp -a "$ROOT_DIR/public" "$ROOT_DIR/.next/standalone/public"
  fi
  rm -rf "$ROOT_DIR/.next/standalone/.next/static"
  cp -a "$ROOT_DIR/.next/static" "$ROOT_DIR/.next/standalone/.next/static"
fi

exec node "$ROOT_DIR/.next/standalone/server.js"
