#!/usr/bin/env bash
set -euo pipefail

# Install MySQL server on Linux.
# Supports: Ubuntu/Debian (mysql-server), RHEL/CentOS/Fedora (mariadb-server fallback).

if [[ "${EUID}" -ne 0 ]]; then
  echo "Please run as root (or with sudo)." >&2
  exit 1
fi

if command -v apt-get >/dev/null 2>&1; then
  export DEBIAN_FRONTEND=noninteractive
  apt-get update
  apt-get install -y mysql-server
  systemctl enable --now mysql
  echo "MySQL installed and started (service: mysql)."
elif command -v dnf >/dev/null 2>&1; then
  dnf install -y mariadb-server
  systemctl enable --now mariadb
  echo "MariaDB installed and started (MySQL-compatible, service: mariadb)."
elif command -v yum >/dev/null 2>&1; then
  yum install -y mariadb-server
  systemctl enable --now mariadb
  echo "MariaDB installed and started (MySQL-compatible, service: mariadb)."
else
  echo "Unsupported package manager. Please install MySQL manually." >&2
  exit 1
fi

echo "Next step: run 'mysql_secure_installation' to harden the database server."
