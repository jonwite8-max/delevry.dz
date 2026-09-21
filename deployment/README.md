# DELEVRY.DZ production deployment

This repository is the single source of truth for the application.

Production uses Next.js standalone output.

Required runtime:
- .next/standalone/server.js
- .next/static/
- public/

The production environment stays outside the release package at:
/var/www/delevry-dz/shared/.env

`npm run start` executes `deployment/start.sh`.

The web process does not run database migrations automatically.
