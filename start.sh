#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-3100}"

"$ROOT_DIR/scripts/prepare-runtime.sh"

if [[ ! -x "$ROOT_DIR/node_modules/.bin/next" ]]; then
  echo "Missing Next.js binary. Run npm install before starting TradeVibe." >&2
  exit 1
fi

cd "$ROOT_DIR"
exec "$ROOT_DIR/node_modules/.bin/next" start -H "$HOST" -p "$PORT"
