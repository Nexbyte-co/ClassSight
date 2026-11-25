#!/usr/bin/env bash
# cs-start: bring up the whole local ClassSight stack.
#   1. Postgres (docker compose, or the system postgresql service)
#   2. local photo storage (SeaweedFS on :8333), when backend/.env points S3_ENDPOINT_URL at localhost
#   3. database migrations (alembic upgrade head)
#   4. backend API  (uvicorn on :8000)
#   5. frontend     (vite dev server on :5173)
# Ctrl+C stops the backend and frontend. Postgres keeps running.
#
# Overrides: CS_PYTHON=/path/to/python  CS_LOG_DIR=/path/to/logs
#            CS_API_PORT=8000           CS_WEB_PORT=5173

set -euo pipefail

SELF="$(readlink -f "${BASH_SOURCE[0]}")"   # follow the ~/.local/bin symlink
ROOT="$(cd "$(dirname "$SELF")/.." && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"
LOG_DIR="${CS_LOG_DIR:-$HOME/.cache/classsight/logs}"
API_PORT="${CS_API_PORT:-8000}"
WEB_PORT="${CS_WEB_PORT:-5173}"
PG_PORT=5432

log() { printf '\033[1;36m[cs-start]\033[0m %s\n' "$*"; }
die() { printf '\033[1;31m[cs-start] ERROR:\033[0m %s\n' "$*" >&2; exit 1; }

# Pick a Python that has the backend packages installed.
pick_python() {
  if [ -n "${CS_PYTHON:-}" ]; then echo "$CS_PYTHON"; return; fi
  for candidate in "$BACKEND/venv/bin/python" "$HOME/classsight-venv-312/bin/python"; do
    if [ -x "$candidate" ]; then echo "$candidate"; return; fi
  done
  echo "python3"
}
PY="$(pick_python)"

port_open() { (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null; }

wait_for() { # wait_for <description> <seconds> <command...>
  local what="$1" secs="$2"; shift 2
  for _ in $(seq 1 "$secs"); do
    if "$@" >/dev/null 2>&1; then return 0; fi
    sleep 1
  done
  die "$what did not become ready within ${secs}s"
}

port_busy() { # port_busy <port> <name>: stop early instead of talking to a stale server
  if port_open "$1"; then
    local who
    local pids
    pids="$(ss -ltnp 2>/dev/null | grep ":$1 " | grep -o 'pid=[0-9]*' | cut -d= -f2 | sort -u | tr '\n' ' ' || true)"
    die "port $1 ($2) is already in use${pids:+ by PID $pids}. Stop that process and rerun."
  fi
}

command -v npm >/dev/null || die "npm not found on PATH"
[ -d "$FRONTEND/node_modules" ] || die "frontend/node_modules missing: run 'npm install' in frontend/"
[ -f "$BACKEND/.env" ] || die "backend/.env missing"
"$PY" -c "import uvicorn, alembic, psycopg" 2>/dev/null \
  || die "backend packages not importable with $PY (set CS_PYTHON or create backend/venv)"

mkdir -p "$LOG_DIR"
API_PID=""; WEB_PID=""
cleanup() {
  log "stopping backend and frontend..."
  [ -n "$WEB_PID" ] && kill "$WEB_PID" 2>/dev/null || true
  [ -n "$API_PID" ] && kill "$API_PID" 2>/dev/null || true
  wait 2>/dev/null || true
}
trap 'exit 130' INT TERM
trap cleanup EXIT

# 1. Postgres
if port_open "$PG_PORT"; then
  log "Postgres already running on :$PG_PORT"
elif command -v docker >/dev/null && docker info >/dev/null 2>&1; then
  log "starting Postgres with docker compose..."
  docker compose -f "$ROOT/deployment/docker-compose.yml" up -d postgres
  wait_for "Postgres" 60 port_open "$PG_PORT"
elif systemctl list-unit-files postgresql.service >/dev/null 2>&1; then
  log "starting system postgresql service (sudo may ask for your password)..."
  sudo systemctl start postgresql
  wait_for "Postgres" 30 port_open "$PG_PORT"
else
  die "Postgres is not running on :$PG_PORT, and neither docker nor a postgresql service is available. Install/start one, then rerun."
fi

# 2. Local photo storage: only when backend/.env sends photos to a local S3-compatible store.
S3_URL="$(sed -n 's/^S3_ENDPOINT_URL=\([^ #]*\).*/\1/p' "$BACKEND/.env" | head -n 1)"
case "$S3_URL" in
  http://localhost:*|http://127.0.0.1:*)
    S3_PORT="${S3_URL##*:}"
    if port_open "$S3_PORT"; then
      log "local photo storage already running on :$S3_PORT"
    elif command -v docker >/dev/null && docker info >/dev/null 2>&1; then
      log "starting local photo storage (SeaweedFS) with docker compose..."
      docker compose -f "$ROOT/deployment/docker-compose.yml" --profile local up -d s3 >"$LOG_DIR/s3.log" 2>&1 \
        || { tail -n 10 "$LOG_DIR/s3.log" >&2; die "could not start local photo storage (see $LOG_DIR/s3.log)"; }
      wait_for "local photo storage" 60 port_open "$S3_PORT"
    else
      die "backend/.env uses local photo storage on :$S3_PORT but it is not running and docker is unavailable."
    fi
    # The bucket is created once; this is a no-op when it already exists.
    (cd "$BACKEND" && "$PY" - <<'PYEOF'
import time
import boto3
from app.core.config import get_settings

cfg = get_settings()
client = boto3.client(
    "s3",
    region_name=cfg.aws_region,
    endpoint_url=cfg.s3_endpoint_url,
    aws_access_key_id=cfg.local_s3_access_key,
    aws_secret_access_key=cfg.local_s3_secret_key,
)
for _ in range(30):
    try:
        if cfg.s3_bucket_name not in [b["Name"] for b in client.list_buckets()["Buckets"]]:
            client.create_bucket(Bucket=cfg.s3_bucket_name)
        break
    except Exception:
        time.sleep(1)
else:
    raise SystemExit("local photo storage never became ready")
PYEOF
    ) || die "could not prepare the photo bucket"
    ;;
esac

# 3. Migrations
log "running migrations..."
(cd "$BACKEND" && "$PY" -m alembic upgrade head) >"$LOG_DIR/migrate.log" 2>&1 \
  || { tail -n 20 "$LOG_DIR/migrate.log" >&2; die "alembic upgrade failed (see $LOG_DIR/migrate.log)"; }

# 4. Backend
port_busy "$API_PORT" "backend"
log "starting backend on :$API_PORT (log: $LOG_DIR/api.log)"
(cd "$BACKEND" && exec "$PY" -m uvicorn app.main:app --host 0.0.0.0 --port "$API_PORT" --reload) \
  >"$LOG_DIR/api.log" 2>&1 &
API_PID=$!
wait_for "backend" 60 curl -fsS "http://127.0.0.1:$API_PORT/health"
kill -0 "$API_PID" 2>/dev/null || { tail -n 10 "$LOG_DIR/api.log" >&2; die "backend exited (see $LOG_DIR/api.log)"; }

# 5. Frontend
port_busy "$WEB_PORT" "frontend"
log "starting frontend on :$WEB_PORT (log: $LOG_DIR/web.log)"
(cd "$FRONTEND" && exec npm run dev -- --host 127.0.0.1 --port "$WEB_PORT" --strictPort) \
  >"$LOG_DIR/web.log" 2>&1 &
WEB_PID=$!
wait_for "frontend" 60 port_open "$WEB_PORT"
kill -0 "$WEB_PID" 2>/dev/null || { tail -n 10 "$LOG_DIR/web.log" >&2; die "frontend exited (see $LOG_DIR/web.log)"; }

cat <<EOF

  ClassSight is running
    App:      http://localhost:$WEB_PORT
    API docs: http://localhost:$API_PORT/docs
    Logs:     $LOG_DIR

  Press Ctrl+C to stop the backend and frontend.
EOF

wait "$API_PID" "$WEB_PID" || true
