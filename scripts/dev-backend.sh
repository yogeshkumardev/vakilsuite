#!/usr/bin/env bash
# Local API + Celery worker only. PostgreSQL and Redis are intentionally external.
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
API_PID=""
WORKER_PID=""
BEAT_PID=""

cleanup() {
  if [[ -n "$API_PID" ]] && kill -0 "$API_PID" 2>/dev/null; then
    kill "$API_PID" 2>/dev/null || true
    wait "$API_PID" 2>/dev/null || true
  fi
  if [[ -n "$WORKER_PID" ]] && kill -0 "$WORKER_PID" 2>/dev/null; then
    kill "$WORKER_PID" 2>/dev/null || true
    wait "$WORKER_PID" 2>/dev/null || true
  fi
  if [[ -n "$BEAT_PID" ]] && kill -0 "$BEAT_PID" 2>/dev/null; then
    kill "$BEAT_PID" 2>/dev/null || true
    wait "$BEAT_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

[[ -f "$BACKEND_DIR/.env" ]] || { echo "Missing backend/.env" >&2; exit 1; }
command -v uv >/dev/null || { echo "uv is required" >&2; exit 1; }

cd "$BACKEND_DIR"
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
API_PID=$!

echo "API: http://localhost:8000/docs"
echo "Celery worker and recovery scheduler are running in this terminal. Ctrl+C stops all processes."
uv run celery -A app.worker.celery_app:celery_app worker --loglevel=info --concurrency="${CELERY_DEV_CONCURRENCY:-2}" &
WORKER_PID=$!
uv run celery -A app.worker.celery_app:celery_app beat --loglevel=info --schedule=/tmp/vakilsuite-celerybeat &
BEAT_PID=$!
wait "$WORKER_PID"
