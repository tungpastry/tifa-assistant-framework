#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNTIME_DIR="${TRADEVIBE_RUNTIME_DIR:-$ROOT_DIR/runtime}"
LOG_DIR="$RUNTIME_DIR/logs"
LOGFILE="$LOG_DIR/tradevibe_pipeline.log"

"$ROOT_DIR/scripts/prepare-runtime.sh"

mkdir -p "$LOG_DIR"

MOODS=("focused" "tired" "anxious" "happy" "confident")

if [[ -z "${TRADERVIBE_MOOD:-}" ]]; then
  TRADERVIBE_MOOD="${MOODS[$RANDOM % ${#MOODS[@]}]}"
fi

MOOD="$TRADERVIBE_MOOD"
export TRADERVIBE_MOOD="$MOOD"

{
  echo "==============================="
  echo "Time: $(date '+%Y-%m-%d %H:%M:%S')"
  echo "Selected mood: $MOOD"
  echo "==============================="

  /usr/bin/python3 "$ROOT_DIR/insight_engine/insight_engine_v3.py"

  /usr/bin/python3 "$ROOT_DIR/insight_engine/music_recommender_v3.py"

  echo "Completed TradeVibe daily generation"
  echo
} >> "$LOGFILE" 2>&1
