#!/usr/bin/env bash
set -euo pipefail

# Install a web-based MySQL manager (Adminer) on Linux.
# URL after install: http://<server-ip>/adminer.php

if [[ "${EUID}" -ne 0 ]]; then
  echo "Please run as root (or with sudo)." >&2
  exit 1
fi

install_adminer_debian() {
  export DEBIAN_FRONTEND=noninteractive
  apt-get update
  apt-get install -y apache2 php php-mysql curl
  curl -fsSL https://github.com/vrana/adminer/releases/download/v4.8.1/adminer-4.8.1.php -o /var/www/html/adminer.php
  chown www-data:www-data /var/www/html/adminer.php
  chmod 0644 /var/www/html/adminer.php
  systemctl enable --now apache2
  echo "Adminer installed. Open: http://<server-ip>/adminer.php"
}

install_adminer_rhel() {
  if command -v dnf >/dev/null 2>&1; then
    dnf install -y httpd php php-mysqlnd curl
  else
    yum install -y httpd php php-mysqlnd curl
  fi
  curl -fsSL https://github.com/vrana/adminer/releases/download/v4.8.1/adminer-4.8.1.php -o /var/www/html/adminer.php
  chown apache:apache /var/www/html/adminer.php || true
  chmod 0644 /var/www/html/adminer.php
  systemctl enable --now httpd
  echo "Adminer installed. Open: http://<server-ip>/adminer.php"
}

if command -v apt-get >/dev/null 2>&1; then
  install_adminer_debian
elif command -v dnf >/dev/null 2>&1 || command -v yum >/dev/null 2>&1; then
  install_adminer_rhel
else
  echo "Unsupported package manager. Please install Adminer manually." >&2
  exit 1
fi
