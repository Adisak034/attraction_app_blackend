#!/usr/bin/env bash
set -euo pipefail

# Manage web server for MySQL manager (phpMyAdmin).
# Usage: ./scripts/run-mysql-manager.sh [start|stop|restart|status]

ACTION="${1:-start}"

SERVICE=""
SERVICE_MANAGER=""

if command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files >/dev/null 2>&1; then
  if systemctl list-unit-files | grep -q '^apache2\.service'; then
    SERVICE_MANAGER="systemctl"
    SERVICE="apache2"
  elif systemctl list-unit-files | grep -q '^httpd\.service'; then
    SERVICE_MANAGER="systemctl"
    SERVICE="httpd"
  fi
fi

if [[ -z "${SERVICE}" ]] && command -v service >/dev/null 2>&1; then
  SERVICE_MANAGER="service"
  if [[ -x "/etc/init.d/apache2" ]]; then
    SERVICE="apache2"
  elif [[ -x "/etc/init.d/httpd" ]]; then
    SERVICE="httpd"
  fi
fi

if [[ -z "${SERVICE_MANAGER}" || -z "${SERVICE}" ]]; then
  echo "Apache service not found. Install MySQL manager first." >&2
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

if [[ "${ACTION}" == "start" || "${ACTION}" == "restart" || "${ACTION}" == "status" ]]; then
  echo "MySQL manager URL: http://<server-ip>/phpmyadmin"
fi
