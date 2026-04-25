#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v gemini >/dev/null 2>&1; then
  echo "ERROR: gemini CLI not found in PATH"
  exit 1
fi

if [[ ! -f "$ROOT/bootstrap.txt" ]]; then
  echo "ERROR: bootstrap.txt not found at repo root"
  exit 1
fi

exec gemini --context @bootstrap.txt "$@"
