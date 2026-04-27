#!/usr/bin/env bash
set -euo pipefail

# Full setup script for MySQL, Apache, and phpMyAdmin
# - Installs missing dependencies
# - Sets up configurations
# - Starts all services

ACTION="${1:-setup-and-run}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1" >&2
}

# Check if running as root
check_root() {
  if [[ "${EUID}" -ne 0 ]]; then
    log_error "This script must be run as root. Use: sudo $0"
    exit 1
  fi
}

# Detect package manager and OS
detect_package_manager() {
  if command -v apt-get >/dev/null 2>&1; then
    PKG_MANAGER="apt"
    SERVICE_MANAGER="service"
  elif command -v dnf >/dev/null 2>&1; then
    PKG_MANAGER="dnf"
    SERVICE_MANAGER="systemctl"
  elif command -v yum >/dev/null 2>&1; then
    PKG_MANAGER="yum"
    SERVICE_MANAGER="systemctl"
  else
    log_error "Unsupported package manager"
    exit 1
  fi
  log_info "Detected package manager: $PKG_MANAGER"
}

# Check if service is installed
is_service_installed() {
  local service_name="$1"
  
  if [[ "$SERVICE_MANAGER" == "systemctl" ]]; then
    systemctl list-unit-files | grep -q "^${service_name}\.service" 2>/dev/null && return 0 || return 1
  else
    [[ -x "/etc/init.d/$service_name" ]] && return 0 || return 1
  fi
}

# Get actual service name (mysql, mysqld, or mariadb)
get_mysql_service() {
  if is_service_installed "mysql"; then
    echo "mysql"
  elif is_service_installed "mysqld"; then
    echo "mysqld"
  elif is_service_installed "mariadb"; then
    echo "mariadb"
  else
    echo ""
  fi
}

# Get web server service name (apache2 or httpd)
get_web_service() {
  if is_service_installed "apache2"; then
    echo "apache2"
  elif is_service_installed "httpd"; then
    echo "httpd"
  else
    echo ""
  fi
}

# Install MySQL
install_mysql() {
  if [[ -n "$(get_mysql_service)" ]]; then
    log_warn "MySQL/MariaDB is already installed"
    return
  fi

  log_info "Installing MySQL..."
  
  if [[ "$PKG_MANAGER" == "apt" ]]; then
    export DEBIAN_FRONTEND=noninteractive
    apt-get update
    apt-get install -y mysql-server
  elif [[ "$PKG_MANAGER" == "dnf" ]]; then
    dnf install -y mariadb-server
  elif [[ "$PKG_MANAGER" == "yum" ]]; then
    yum install -y mariadb-server
  fi
  
  log_info "MySQL installation complete"
}

# Install Apache and phpMyAdmin
install_apache_phpmyadmin() {
  local web_service=$(get_web_service)
  
  if [[ -n "$web_service" ]] && command -v phpmyadmin >/dev/null 2>&1 || [[ -d /usr/share/phpmyadmin ]]; then
    log_warn "Apache and phpMyAdmin are already installed"
    return
  fi

  log_info "Installing Apache and phpMyAdmin..."
  
  if [[ "$PKG_MANAGER" == "apt" ]]; then
    export DEBIAN_FRONTEND=noninteractive
    apt-get update
    echo "phpmyadmin phpmyadmin/reconfigure-webserver multiselect apache2" | debconf-set-selections
    echo "phpmyadmin phpmyadmin/dbconfig-install boolean false" | debconf-set-selections
    apt-get install -y apache2 php php-mysql php-mbstring php-zip php-gd php-json php-curl phpmyadmin
    
    # Enable PHP and phpMyAdmin
    a2enmod php8.3 2>/dev/null || a2enmod php 2>/dev/null || true
    if [[ -f /etc/apache2/conf-available/phpmyadmin.conf ]]; then
      a2enconf phpmyadmin
    fi
    phpenmod mbstring || true
    
  elif [[ "$PKG_MANAGER" == "dnf" ]]; then
    dnf install -y httpd php php-mysqlnd phpMyAdmin
  elif [[ "$PKG_MANAGER" == "yum" ]]; then
    yum install -y httpd php php-mysqlnd phpMyAdmin
  fi
  
  log_info "Apache and phpMyAdmin installation complete"
}

# Setup phpMyAdmin configuration
setup_phpmyadmin() {
  log_info "Setting up phpMyAdmin..."
  
  # Create symlink in DocumentRoot if not exists
  if [[ ! -L /var/www/html/phpmyadmin && ! -d /var/www/html/phpmyadmin ]]; then
    ln -s /usr/share/phpmyadmin /var/www/html/phpmyadmin || log_warn "Could not create symlink"
  fi
  
  # Create Apache config for phpMyAdmin if not exists
  if [[ ! -f /etc/apache2/conf-available/phpmyadmin.conf ]]; then
    mkdir -p /etc/apache2/conf-available
    cat > /etc/apache2/conf-available/phpmyadmin.conf << 'EOF'
# phpMyAdmin Apache Configuration

<Directory /var/www/html/phpmyadmin>
    Options FollowSymLinks
    AllowOverride All
    Require all granted
</Directory>

<Directory /usr/share/phpmyadmin>
    Options FollowSymLinks
    AllowOverride All
    Require all granted
</Directory>

# Fix redirect issue for proxied environments (Codespace)
SetEnvIf X-Forwarded-Proto "^https$" HTTPS=on
EOF
    log_info "Created /etc/apache2/conf-available/phpmyadmin.conf"
  fi
  
  # Enable config if not already enabled
  if [[ ! -L /etc/apache2/conf-enabled/phpmyadmin.conf ]]; then
    a2enconf phpmyadmin 2>/dev/null || log_warn "Could not enable phpMyAdmin config"
  fi
  
  log_info "phpMyAdmin setup complete"
}

# Start services
start_services() {
  log_info "Starting services..."
  
  local mysql_service=$(get_mysql_service)
  local web_service=$(get_web_service)
  
  if [[ -z "$mysql_service" ]]; then
    log_error "MySQL service not found"
    return 1
  fi
  
  if [[ -z "$web_service" ]]; then
    log_error "Web server service not found"
    return 1
  fi
  
  # Start MySQL
  if [[ "$SERVICE_MANAGER" == "systemctl" ]]; then
    systemctl enable --now "$mysql_service" 2>/dev/null || systemctl start "$mysql_service" || true
  else
    sudo service "$mysql_service" restart || true
  fi
  
  sleep 2
  log_info "✓ MySQL service started: $mysql_service"
  
  # Start Apache
  if [[ "$SERVICE_MANAGER" == "systemctl" ]]; then
    systemctl enable --now "$web_service" 2>/dev/null || systemctl start "$web_service" || true
  else
    sudo service "$web_service" restart || true
  fi
  
  sleep 2
  log_info "✓ Web server service started: $web_service"
  
  # Verify MySQL connection
  if mysql -u root -e "SELECT 1" >/dev/null 2>&1; then
    log_info "✓ MySQL connection verified"
  else
    log_warn "Could not verify MySQL connection"
  fi
  
  # Show phpMyAdmin URL
  local codespace_name="${CODESPACE_NAME:-localhost}"
  log_info "phpMyAdmin URL: http://${codespace_name}-80.app.github.dev/phpmyadmin/ or http://localhost/phpmyadmin"
}

# Main execution
main() {
  case "${ACTION}" in
    setup-and-run)
      check_root
      detect_package_manager
      log_info "Starting full setup..."
      install_mysql
      install_apache_phpmyadmin
      setup_phpmyadmin
      start_services
      log_info "✓ Setup complete!"
      ;;
    
    install-only)
      check_root
      detect_package_manager
      log_info "Installing dependencies..."
      install_mysql
      install_apache_phpmyadmin
      setup_phpmyadmin
      log_info "✓ Installation complete"
      ;;
    
    start)
      check_root
      detect_package_manager
      start_services
      ;;
    
    stop)
      check_root
      detect_package_manager
      local mysql_service=$(get_mysql_service)
      local web_service=$(get_web_service)
      
      if [[ -n "$mysql_service" ]]; then
        if [[ "$SERVICE_MANAGER" == "systemctl" ]]; then
          systemctl stop "$mysql_service" || true
        else
          sudo service "$mysql_service" stop || true
        fi
        log_info "✓ MySQL stopped"
      fi
      
      if [[ -n "$web_service" ]]; then
        if [[ "$SERVICE_MANAGER" == "systemctl" ]]; then
          systemctl stop "$web_service" || true
        else
          sudo service "$web_service" stop || true
        fi
        log_info "✓ Web server stopped"
      fi
      ;;
    
    restart)
      check_root
      detect_package_manager
      log_info "Restarting services..."
      $0 stop
      sleep 2
      $0 start
      ;;
    
    status)
      detect_package_manager
      local mysql_service=$(get_mysql_service)
      local web_service=$(get_web_service)
      
      echo -e "\n${YELLOW}=== Service Status ===${NC}"
      
      if [[ -n "$mysql_service" ]]; then
        if [[ "$SERVICE_MANAGER" == "systemctl" ]]; then
          systemctl status "$mysql_service" --no-pager 2>&1 | head -3
        else
          sudo service "$mysql_service" status 2>&1 | head -3
        fi
      else
        log_warn "MySQL service not found"
      fi
      
      echo ""
      
      if [[ -n "$web_service" ]]; then
        if [[ "$SERVICE_MANAGER" == "systemctl" ]]; then
          systemctl status "$web_service" --no-pager 2>&1 | head -3
        else
          sudo service "$web_service" status 2>&1 | head -3
        fi
      else
        log_warn "Web server service not found"
      fi
      
      # Check phpMyAdmin access
      if [[ -d /var/www/html/phpmyadmin || -L /var/www/html/phpmyadmin ]]; then
        echo -e "\n${GREEN}✓ phpMyAdmin is accessible${NC}"
        echo "URL: http://localhost/phpmyadmin"
      fi
      ;;
    
    help|--help|-h)
      cat << EOF
Usage: $0 [ACTION]

Actions:
  setup-and-run    (default) Install, setup, and start all services
  install-only     Only install/setup without starting services
  start            Start MySQL and Apache/phpMyAdmin services
  stop             Stop all services
  restart          Restart all services
  status           Show service status
  help             Show this help message

Examples:
  sudo $0 setup-and-run
  sudo $0 start
  sudo $0 status
EOF
      ;;
    
    *)
      log_error "Unknown action: $ACTION"
      echo "Use '$0 help' for available actions"
      exit 1
      ;;
  esac
}

main
