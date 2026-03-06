#!/usr/bin/env bash
set -euo pipefail

# Run frontend on Linux server.
# Usage:
#   ./scripts/run-frontend.sh dev
#   ./scripts/run-frontend.sh production
# Optional environment variables:
#   HOST=0.0.0.0 PORT=5173 INSTALL_DEPS=true ./scripts/run-frontend.sh dev
#   HOST=0.0.0.0 PORT=4173 INSTALL_DEPS=true ./scripts/run-frontend.sh production

MODE="${1:-production}"
HOST="${HOST:-0.0.0.0}"
INSTALL_DEPS="${INSTALL_DEPS:-true}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

if [[ ! -f "${PROJECT_ROOT}/package.json" ]]; then
  echo "Error: package.json not found in project root: ${PROJECT_ROOT}" >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Error: Node.js is not installed or not in PATH." >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is not installed or not in PATH." >&2
  exit 1
fi

cd "${PROJECT_ROOT}"

if [[ "${INSTALL_DEPS}" == "true" ]]; then
  if [[ -f "package-lock.json" ]]; then
    npm ci
  else
    npm install
  fi
fi

case "${MODE}" in
  dev)
    PORT="${PORT:-5173}"
    echo "Starting frontend in DEV mode on ${HOST}:${PORT}"
    exec npm run dev -- --host "${HOST}" --port "${PORT}"
    ;;
  production|preview)
    PORT="${PORT:-4173}"
    echo "Building frontend..."
    npm run build
    echo "Starting frontend in PREVIEW mode on ${HOST}:${PORT}"
    exec npm run preview -- --host "${HOST}" --port "${PORT}"
    ;;
  *)
    echo "Error: invalid mode '${MODE}'. Use 'dev' or 'production'." >&2
    exit 1
    ;;
esac
