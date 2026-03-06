#!/usr/bin/env bash
set -euo pipefail

# Manage web server for MySQL manager (Adminer).
# Usage: ./scripts/run-mysql-manager.sh [start|stop|restart|status]

ACTION="${1:-start}"

if ! command -v systemctl >/dev/null 2>&1; then
  echo "systemctl not found. Please manage web service manually." >&2
  exit 1
fi

SERVICE=""
if systemctl list-unit-files | grep -q '^apache2\.service'; then
  SERVICE="apache2"
elif systemctl list-unit-files | grep -q '^httpd\.service'; then
  SERVICE="httpd"
else
  echo "Apache service not found. Install MySQL manager first." >&2
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

if [[ "${ACTION}" == "start" || "${ACTION}" == "restart" || "${ACTION}" == "status" ]]; then
  echo "MySQL manager URL: http://<server-ip>/adminer.php"
fi
