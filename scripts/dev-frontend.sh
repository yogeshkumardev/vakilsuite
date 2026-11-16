#!/usr/bin/env bash
# Local Next.js only. Backend/API is expected to be started separately.
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"

[[ -f "$FRONTEND_DIR/.env" ]] || { echo "Missing frontend/.env" >&2; exit 1; }
command -v pnpm >/dev/null || { echo "pnpm is required" >&2; exit 1; }

cd "$FRONTEND_DIR"
exec env CI=true pnpm run dev
