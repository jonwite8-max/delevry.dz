# Delevry.dz — CloudPanel deployment

This project is a Next.js application backed by PostgreSQL.

## Required server configuration

Create the CloudPanel Node.js application for this directory and configure:

- Application Root: the extracted project directory
- Startup File: deployment/start.sh
- Node.js: 24.x
- Application Port: 3000 (or the port supplied by CloudPanel)

Set these environment variables in CloudPanel. Do not commit them to Git:

- DATABASE_URL
- AUTH_SECRET
- APP_URL
- DEMO_ADMIN_USER
- DEMO_ADMIN_PASSWORD

The PostgreSQL server should remain private and listen on localhost.

## First deployment

After extracting the release, start the Node.js application. The startup script will:

1. install production dependencies when a production build is absent;
2. generate Prisma Client;
3. apply committed migrations with `prisma migrate deploy`;
4. build Next.js in standalone mode;
5. start the standalone server.

## Subsequent releases

Extract the new release into a new directory and point the CloudPanel application to that directory, or replace the application directory during a controlled maintenance window.

Do not copy .env files into releases.

## Important

The startup script is intentionally fail-closed when DATABASE_URL or AUTH_SECRET is missing. It never falls back to a PostgreSQL superuser or a development password.
