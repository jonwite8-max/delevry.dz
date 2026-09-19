# Delevry.dz — CloudPanel deployment

## Runtime

- CloudPanel Node.js application
- Node.js 24.x
- Application Root: the extracted project directory
- Startup File: deployment/start.sh
- Application Port: 3000
- Nginx: reverse proxy to 127.0.0.1:3000
- PostgreSQL: localhost only

## Environment

Configure these variables in CloudPanel or the server environment. Never commit real values:

- DATABASE_URL
- AUTH_SECRET (minimum 32 characters)
- APP_URL
- DEMO_ADMIN_USER
- DEMO_ADMIN_PASSWORD

The application fails closed when DATABASE_URL or AUTH_SECRET is missing.

## Manual ZIP release workflow

1. Upload the release ZIP to the CloudPanel htdocs parent directory.
2. Extract it into the application directory.
3. Keep the existing .env outside the release and link it to the shared environment file.
4. Start/restart the CloudPanel Node.js application.

The startup script is idempotent:

- If a valid standalone build exists, it starts it directly.
- If the build is missing, it installs dependencies, generates Prisma Client, applies committed migrations, builds Next.js, copies public/static assets into the standalone bundle, then starts the server.
- Database migrations are committed and executed with prisma migrate deploy; no db push is used in production.
- No PostgreSQL superuser fallback exists.

## Security

- Do not expose PostgreSQL port 5432 publicly.
- Do not place .env, private keys, backups, node_modules, or .next in the release ZIP.
- Use a strong unique AUTH_SECRET.
- Change the demo administrator password before production use.

## Release verification

A release is not considered delivered until these are verified:

- lint
- typecheck
- unit tests
- production build
- local HTTP response on port 3000
- HTTPS response through Nginx
