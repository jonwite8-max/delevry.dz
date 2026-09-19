#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL is required."
  exit 1
fi

if [[ -z "${AUTH_SECRET:-}" || ${#AUTH_SECRET} -lt 32 ]]; then
  echo "ERROR: AUTH_SECRET must be set and contain at least 32 characters."
  exit 1
fi

export NODE_ENV=production

if [[ ! -f "$ROOT_DIR/.next/BUILD_ID" ]]; then
  echo "Production build not found; building..."
  npm install --omit=dev
  npx prisma generate
  npx prisma migrate deploy
  npm run build
fi

exec node "$ROOT_DIR/.next/standalone/server.js"
