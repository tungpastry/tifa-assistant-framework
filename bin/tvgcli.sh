#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v gemini >/dev/null 2>&1; then
  echo "ERROR: gemini CLI not found in PATH"
  echo "Install or add Gemini CLI to PATH before using tvgcli."
  exit 1
fi

if [[ ! -f "$ROOT/bootstrap.txt" ]]; then
  echo "ERROR: bootstrap.txt not found at repo root: $ROOT/bootstrap.txt"
  exit 1
fi

# Canonical TradeVibe DevOps entrypoint.
# Usage:
#   ./bin/tvgcli.sh "inspect repo and summarize current architecture"
#   ./bin/tvgcli.sh @docs/prompts/P1_inspect.txt
exec gemini --context @bootstrap.txt "$@"
