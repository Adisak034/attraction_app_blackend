#!/usr/bin/env bash
set -euo pipefail

# Run backend on Linux server.
# Usage:
#   ./scripts/run-backend.sh dev
#   ./scripts/run-backend.sh production
# Optional environment variables:
#   HOST=0.0.0.0 PORT=8000 WORKERS=2 INSTALL_DEPS=true ./scripts/run-backend.sh production
#   PYTHON_CMD=/usr/bin/python3 INSTALL_DEPS=false ./scripts/run-backend.sh dev

MODE="${1:-production}"
HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-8000}"
WORKERS="${WORKERS:-2}"
INSTALL_DEPS="${INSTALL_DEPS:-true}"
PYTHON_CMD="${PYTHON_CMD:-}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
BACKEND_PATH="${PROJECT_ROOT}/backend"

if [[ ! -d "${BACKEND_PATH}" ]]; then
  echo "Error: backend directory not found: ${BACKEND_PATH}" >&2
  exit 1
fi

resolve_python() {
  if [[ -n "${PYTHON_CMD}" ]]; then
    if [[ ! -x "${PYTHON_CMD}" ]]; then
      echo "Error: PYTHON_CMD is not executable: ${PYTHON_CMD}" >&2
      exit 1
    fi
    echo "${PYTHON_CMD}"
    return
  fi

  local candidates=(
    "${PROJECT_ROOT}/.venv/bin/python"
    "${BACKEND_PATH}/.venv/bin/python"
  )

  for candidate in "${candidates[@]}"; do
    if [[ -x "${candidate}" ]]; then
      echo "${candidate}"
      return
    fi
  done

  if command -v python3 >/dev/null 2>&1; then
    echo "python3"
    return
  fi

  if command -v python >/dev/null 2>&1; then
    echo "python"
    return
  fi

  echo "Error: Python not found. Install Python or set PYTHON_CMD." >&2
  exit 1
}

PYTHON_BIN="$(resolve_python)"

if [[ "${INSTALL_DEPS}" == "true" ]]; then
  echo "Installing backend dependencies..."
  "${PYTHON_BIN}" -m pip install --upgrade pip
  "${PYTHON_BIN}" -m pip install -r "${BACKEND_PATH}/requirements.txt"
fi

export PYTHONUNBUFFERED=1

cd "${BACKEND_PATH}"

case "${MODE}" in
  dev)
    echo "Starting backend in DEV mode on ${HOST}:${PORT}"
    exec "${PYTHON_BIN}" -m uvicorn app.main:app --host "${HOST}" --port "${PORT}" --reload
    ;;
  production)
    if [[ ! "${WORKERS}" =~ ^[0-9]+$ ]] || [[ "${WORKERS}" -lt 1 ]]; then
      echo "Error: WORKERS must be an integer >= 1" >&2
      exit 1
    fi

    echo "Starting backend in PRODUCTION mode on ${HOST}:${PORT} (workers=${WORKERS})"
    exec "${PYTHON_BIN}" -m uvicorn app.main:app --host "${HOST}" --port "${PORT}" --workers "${WORKERS}"
    ;;
  *)
    echo "Error: invalid mode '${MODE}'. Use 'dev' or 'production'." >&2
    exit 1
    ;;
esac
