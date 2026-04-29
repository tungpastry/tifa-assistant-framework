#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNTIME_DIR="${TRADEVIBE_RUNTIME_DIR:-$ROOT_DIR/runtime}"

DRY_RUN="${TRADEVIBE_CLEANUP_DRY_RUN:-1}"
AUDIO_CACHE_RETENTION_DAYS="${TRADEVIBE_AUDIO_CACHE_RETENTION_DAYS:-30}"
TTS_JOB_RETENTION_DAYS="${TRADEVIBE_TTS_JOB_RETENTION_DAYS:-7}"
LOG_RETENTION_DAYS="${TRADEVIBE_LOG_RETENTION_DAYS:-30}"

is_non_negative_integer() {
  [[ "$1" =~ ^[0-9]+$ ]]
}

cleanup_dir() {
  local label=$1
  local target_dir=$2
  local retention_days=$3

  if ! is_non_negative_integer "$retention_days"; then
    echo "Invalid retention for ${label}: ${retention_days}" >&2
    exit 1
  fi

  if [[ ! -d "$target_dir" ]]; then
    echo "Skipping ${label}: missing ${target_dir}"
    return
  fi

  echo "${label}: files older than ${retention_days} day(s)"

  if [[ "$DRY_RUN" == "1" ]]; then
    find "$target_dir" -type f -mtime +"$retention_days" -print
    return
  fi

  if [[ "$DRY_RUN" != "0" ]]; then
    echo "Invalid TRADEVIBE_CLEANUP_DRY_RUN=${DRY_RUN}; expected 1 or 0" >&2
    exit 1
  fi

  find "$target_dir" -type f -mtime +"$retention_days" -print -delete
}

echo "TradeVibe runtime cleanup"
echo "Runtime dir: ${RUNTIME_DIR}"
echo "Dry run: ${DRY_RUN}"

cleanup_dir "audio_cache" "$RUNTIME_DIR/audio_cache" "$AUDIO_CACHE_RETENTION_DAYS"
cleanup_dir "tts_jobs" "$RUNTIME_DIR/tts_jobs" "$TTS_JOB_RETENTION_DAYS"
cleanup_dir "logs" "$RUNTIME_DIR/logs" "$LOG_RETENTION_DAYS"
