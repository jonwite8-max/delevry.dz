# DELEVRY.DZ production deployment

Production uses Next.js standalone output.

The server runtime is installed once. It creates a persistent systemd service and a release-marker watcher. Future application ZIP releases do not change PostgreSQL, production environment variables, or Nginx/CloudPanel configuration.

The official release ZIP places `.release-complete` as its final archive entry. The watcher restarts the application only after that marker is replaced.

The production environment remains outside the release package.
