#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNTIME_DIR="${TRADEVIBE_RUNTIME_DIR:-$ROOT_DIR/runtime}"
DAILY_VIBES_DIR="$RUNTIME_DIR/daily_vibes"
LOG_DIR="$RUNTIME_DIR/logs"
AUDIO_CACHE_DIR="$RUNTIME_DIR/audio_cache"
TTS_JOBS_DIR="$RUNTIME_DIR/tts_jobs"
CHAT_SESSIONS_DIR="$RUNTIME_DIR/chat_sessions"
LEGACY_OUTPUT_DIR="$ROOT_DIR/insight_engine/output/daily_vibes"
LEGACY_LOG_DIR="$ROOT_DIR/insight_engine/logs"

mkdir -p "$DAILY_VIBES_DIR" "$LOG_DIR" "$AUDIO_CACHE_DIR" "$TTS_JOBS_DIR" "$CHAT_SESSIONS_DIR"

if [[ -d "$LEGACY_OUTPUT_DIR" ]]; then
  cp -an "$LEGACY_OUTPUT_DIR"/. "$DAILY_VIBES_DIR"/ 2>/dev/null || true
fi

if [[ -d "$LEGACY_LOG_DIR" ]]; then
  cp -an "$LEGACY_LOG_DIR"/. "$LOG_DIR"/ 2>/dev/null || true
fi
