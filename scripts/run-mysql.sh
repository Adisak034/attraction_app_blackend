#!/usr/bin/env bash
set -euo pipefail

# Manage MySQL/MariaDB service.
# Usage: ./scripts/run-mysql.sh [start|stop|restart|status]

ACTION="${1:-start}"

if ! command -v systemctl >/dev/null 2>&1; then
  echo "systemctl not found. Please manage database service manually." >&2
  exit 1
fi

SERVICE=""
if systemctl list-unit-files | grep -q '^mysql\.service'; then
  SERVICE="mysql"
elif systemctl list-unit-files | grep -q '^mysqld\.service'; then
  SERVICE="mysqld"
elif systemctl list-unit-files | grep -q '^mariadb\.service'; then
  SERVICE="mariadb"
else
  echo "MySQL/MariaDB service not found. Install database first." >&2
  exit 1
fi

case "${ACTION}" in
  start|stop|restart|status)
    sudo systemctl "${ACTION}" "${SERVICE}"
    ;;
  *)
    echo "Invalid action: ${ACTION}. Use start|stop|restart|status" >&2
    exit 1
    ;;
esac
