#!/usr/bin/env bash
set -euo pipefail

# Install a web-based MySQL manager (phpMyAdmin) on Linux.
# URL after install: http://<server-ip>/phpmyadmin

if [[ "${EUID}" -ne 0 ]]; then
  echo "Please run as root (or with sudo)." >&2
  exit 1
fi

start_web_service() {
  local service_name="$1"

  if command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files >/dev/null 2>&1; then
    if systemctl list-unit-files | grep -q "^${service_name}\\.service"; then
      systemctl enable --now "${service_name}"
      return
    fi
  fi

  if command -v service >/dev/null 2>&1; then
    service "${service_name}" restart
    return
  fi

  echo "Web service manager not found. Start ${service_name} manually." >&2
  exit 1
}

install_phpmyadmin_debian() {
  export DEBIAN_FRONTEND=noninteractive
  apt-get update
  echo "phpmyadmin phpmyadmin/reconfigure-webserver multiselect apache2" | debconf-set-selections
  echo "phpmyadmin phpmyadmin/dbconfig-install boolean false" | debconf-set-selections
  apt-get install -y apache2 php php-mysql php-mbstring php-zip php-gd php-json php-curl phpmyadmin
  phpenmod mbstring || true
  if [[ -f /etc/apache2/conf-available/phpmyadmin.conf ]]; then
    a2enconf phpmyadmin
  fi
  rm -f /var/www/html/adminer.php
  start_web_service apache2
  echo "phpMyAdmin installed. Open: http://<server-ip>/phpmyadmin"
}

install_phpmyadmin_rhel() {
  if command -v dnf >/dev/null 2>&1; then
    dnf install -y httpd php php-mysqlnd phpMyAdmin
  else
    yum install -y httpd php php-mysqlnd phpMyAdmin
  fi
  rm -f /var/www/html/adminer.php
  start_web_service httpd
  echo "phpMyAdmin installed. Open: http://<server-ip>/phpmyadmin"
}

if command -v apt-get >/dev/null 2>&1; then
  install_phpmyadmin_debian
elif command -v dnf >/dev/null 2>&1 || command -v yum >/dev/null 2>&1; then
  install_phpmyadmin_rhel
else
  echo "Unsupported package manager. Please install phpMyAdmin manually." >&2
  exit 1
fi
