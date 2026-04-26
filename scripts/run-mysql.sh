#!/usr/bin/env bash
set -euo pipefail

# Manage MySQL/MariaDB service.
# Usage: ./scripts/run-mysql.sh [start|stop|restart|status]

ACTION="${1:-start}"

SERVICE=""
SERVICE_MANAGER=""

if command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files >/dev/null 2>&1; then
  SERVICE_MANAGER="systemctl"
  if systemctl list-unit-files | grep -q '^mysql\.service'; then
    SERVICE="mysql"
  elif systemctl list-unit-files | grep -q '^mysqld\.service'; then
    SERVICE="mysqld"
  elif systemctl list-unit-files | grep -q '^mariadb\.service'; then
    SERVICE="mariadb"
  fi
elif command -v service >/dev/null 2>&1; then
  SERVICE_MANAGER="service"
  if [[ -x "/etc/init.d/mysql" ]]; then
    SERVICE="mysql"
  elif [[ -x "/etc/init.d/mysqld" ]]; then
    SERVICE="mysqld"
  elif [[ -x "/etc/init.d/mariadb" ]]; then
    SERVICE="mariadb"
  fi
fi

if [[ -z "${SERVICE_MANAGER}" || -z "${SERVICE}" ]]; then
  echo "MySQL/MariaDB service not found. Install database first." >&2
  exit 1
fi

case "${ACTION}" in
  start|stop|restart|status)
    if [[ "${SERVICE_MANAGER}" == "systemctl" ]]; then
      sudo systemctl "${ACTION}" "${SERVICE}"
    else
      sudo service "${SERVICE}" "${ACTION}"
    fi
    ;;
  *)
    echo "Invalid action: ${ACTION}. Use start|stop|restart|status" >&2
    exit 1
    ;;
esac
