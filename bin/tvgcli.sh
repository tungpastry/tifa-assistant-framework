#!/usr/bin/env bash
set -euo pipefail

SCRIPT_PATH="$(readlink -f "${BASH_SOURCE[0]}")"
ROOT="$(cd "$(dirname "$SCRIPT_PATH")/.." && pwd)"
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

if [[ $# -eq 0 ]]; then
  echo "Usage:"
  echo '  tvgcli "your instruction"'
  echo "  tvgcli @path/to/prompt.txt"
  exit 1
fi

USER_PROMPT=""

if [[ "$1" == @* ]]; then
  PROMPT_FILE="${1#@}"
  if [[ ! -f "$PROMPT_FILE" ]]; then
    echo "ERROR: prompt file not found: $PROMPT_FILE"
    exit 1
  fi
  USER_PROMPT="$(cat "$PROMPT_FILE")"
  shift
  if [[ $# -gt 0 ]]; then
    USER_PROMPT="$USER_PROMPT

Additional instruction:
$*"
  fi
else
  USER_PROMPT="$*"
fi

FULL_PROMPT="$(cat "$ROOT/bootstrap.txt")

USER TASK:
$USER_PROMPT"

exec gemini -p "$FULL_PROMPT"
