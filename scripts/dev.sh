#!/usr/bin/env bash
# Start or stop the complete local VakilSuite development stack.
# Usage: ./scripts/dev.sh [start|stop|status] [--android]

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
ANDROID_DIR="$ROOT_DIR/android-app"
RUNTIME_DIR="$ROOT_DIR/.local/vakilsuite-dev"
PID_FILE="$RUNTIME_DIR/pids"
LOG_DIR="$RUNTIME_DIR/logs"

ACTION="start"
START_ANDROID=false

usage() {
  cat <<'EOF'
Usage: ./scripts/dev.sh [start|stop|status] [--android]

Commands:
  start       Start Docker, migrations, API, Celery worker/beat and web app (default)
  stop        Stop processes started by this script; Docker data remains running
  status      Show the local process and Docker status

Options:
  --android   Also start Expo Metro on port 8081 for a USB development build
  --help      Show this help
EOF
}

log() { printf '\n[VakilSuite] %s\n' "$*"; }
die() { printf '\n[VakilSuite] Error: %s\n' "$*" >&2; exit 1; }

for argument in "$@"; do
  case "$argument" in
    start|stop|status) ACTION="$argument" ;;
    --android) START_ANDROID=true ;;
    --help|-h) usage; exit 0 ;;
    *) die "Unknown option: $argument. Run ./scripts/dev.sh --help." ;;
  esac
done

read_pids() {
  [[ -f "$PID_FILE" ]] || return 0
  while IFS='=' read -r name pid; do
    [[ -n "${name:-}" && -n "${pid:-}" ]] || continue
    printf '%s %s\n' "$name" "$pid"
  done < "$PID_FILE"
}

stop_processes() {
  local found=false
  while read -r name pid; do
    [[ -n "${name:-}" ]] || continue
    if kill -0 "$pid" 2>/dev/null; then
      found=true
      log "Stopping $name"
      # Each process is launched in its own session, so its reload children stop too.
      kill -- -"$pid" 2>/dev/null || kill "$pid" 2>/dev/null || true
    fi
  done < <(read_pids)
  rm -f "$PID_FILE"
  if [[ "$found" == false ]]; then
    log "No local application processes were running."
  fi
}

show_status() {
  log "Application processes"
  local any=false
  while read -r name pid; do
    [[ -n "${name:-}" ]] || continue
    any=true
    if kill -0 "$pid" 2>/dev/null; then
      printf '  %-10s running (pid %s)\n' "$name" "$pid"
    else
      printf '  %-10s stopped\n' "$name"
    fi
  done < <(read_pids)
  [[ "$any" == true ]] || printf '  none started by this script\n'
  log "Docker services"
  (cd "$BACKEND_DIR" && docker compose ps) || true
}

if [[ "$ACTION" == "stop" ]]; then
  stop_processes
  exit 0
fi

if [[ "$ACTION" == "status" ]]; then
  show_status
  exit 0
fi

command -v docker >/dev/null || die "Docker is required."
command -v uv >/dev/null || die "uv is required."
command -v pnpm >/dev/null || die "pnpm is required."
[[ -f "$BACKEND_DIR/.env" ]] || die "Missing backend/.env. Create it before starting the stack."
[[ -f "$FRONTEND_DIR/.env" ]] || die "Missing frontend/.env. Create it before starting the stack."

if [[ -f "$PID_FILE" ]] && read_pids | awk '{print $2}' | xargs -r -n1 kill -0 2>/dev/null; then
  die "A local stack is already running. Use ./scripts/dev.sh status or ./scripts/dev.sh stop."
fi

ensure_port_is_free() {
  local port="$1"
  local service="$2"
  command -v ss >/dev/null || return 0
  if ss -ltnH "sport = :$port" 2>/dev/null | grep -q .; then
    die "Port $port is already in use. Stop the existing $service process before starting this stack."
  fi
}

ensure_port_is_free 8000 "backend"
ensure_port_is_free 3000 "frontend"
if [[ "$START_ANDROID" == true ]]; then
  ensure_port_is_free 8081 "Expo Metro"
fi

rm -f "$PID_FILE"
mkdir -p "$LOG_DIR"

log "Starting PostgreSQL and Redis"
(cd "$BACKEND_DIR" && docker compose up -d)

if [[ ! -x "$BACKEND_DIR/.venv/bin/python" ]]; then
  log "Installing backend dependencies"
  (cd "$BACKEND_DIR" && uv sync --locked)
fi
if [[ ! -d "$FRONTEND_DIR/node_modules" ]]; then
  log "Installing frontend dependencies"
  (cd "$FRONTEND_DIR" && pnpm install --frozen-lockfile)
fi
if [[ "$START_ANDROID" == true && ! -d "$ANDROID_DIR/node_modules" ]]; then
  log "Installing Android dependencies"
  (cd "$ANDROID_DIR" && pnpm install --frozen-lockfile)
fi

log "Applying database migrations"
(cd "$BACKEND_DIR" && uv run alembic upgrade head)

start_process() {
  local name="$1"
  local working_directory="$2"
  shift 2
  # setsid lets Ctrl+C and `stop` terminate reload/worker child processes together.
  (cd "$working_directory" && exec setsid "$@") >> "$LOG_DIR/$name.log" 2>&1 &
  local pid=$!
  printf '%s=%s\n' "$name" "$pid" >> "$PID_FILE"
}

start_process backend "$BACKEND_DIR" uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
start_process worker "$BACKEND_DIR" uv run celery -A app.worker.celery_app:celery_app worker --loglevel=info
start_process beat "$BACKEND_DIR" uv run celery -A app.worker.celery_app:celery_app beat --loglevel=info --schedule=/tmp/vakilsuite-celerybeat
start_process frontend "$FRONTEND_DIR" pnpm dev
if [[ "$START_ANDROID" == true ]]; then
  start_process metro "$ANDROID_DIR" pnpm start:usb
fi

# Surface a startup failure immediately instead of leaving an apparently healthy
# log tail running after a port/configuration error.
sleep 2
while read -r name pid; do
  if ! kill -0 "$pid" 2>/dev/null; then
    printf '\n[VakilSuite] %s stopped during startup. Recent log output:\n' "$name" >&2
    tail -n 40 "$LOG_DIR/$name.log" >&2 || true
    stop_processes
    exit 1
  fi
done < <(read_pids)

cleanup() {
  log "Stopping local development processes"
  stop_processes
}
trap cleanup INT TERM EXIT

log "Local stack is running"
printf '  Web:     http://localhost:3000\n'
printf '  API:     http://localhost:8000/docs\n'
printf '  Logs:    %s\n' "$LOG_DIR"
printf '  Stop:    Ctrl+C or ./scripts/dev.sh stop\n\n'
printf 'Live logs follow below. Press Ctrl+C to stop the local application processes.\n'

tail -n 30 -F "$LOG_DIR"/*.log &
TAIL_PID=$!
wait "$TAIL_PID"
