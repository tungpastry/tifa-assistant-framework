#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNTIME_DIR="${TIFA_RUNTIME_DIR:-$ROOT_DIR/runtime}"
LOG_DIR="$RUNTIME_DIR/logs"
AUDIO_CACHE_DIR="$RUNTIME_DIR/audio_cache"
TTS_JOBS_DIR="$RUNTIME_DIR/tts_jobs"
CHAT_SESSIONS_DIR="$RUNTIME_DIR/chat_sessions"

mkdir -p "$LOG_DIR" "$AUDIO_CACHE_DIR" "$TTS_JOBS_DIR" "$CHAT_SESSIONS_DIR"
