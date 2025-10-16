#!/bin/bash
LOGFILE="/home/nexus/projects/tradevibe-org/insight_engine/logs/tradevibe_pipeline.log"
mkdir -p "$(dirname "$LOGFILE")"

# 🎯 Mood rotation
MOODS=("focused" "tired" "anxious" "happy" "confident")
MOOD=${MOODS[$RANDOM % ${#MOODS[@]}]}

# Export để script Python nhận biết
export TRADERVIBE_MOOD="$MOOD"

{
  echo "==============================="
  echo "🕒 $(date '+%Y-%m-%d %H:%M:%S')"
  echo "🎯 Selected mood: $MOOD"
  echo "==============================="

  # 1️⃣ Generate vibe + voice
  /usr/bin/python3 /home/nexus/projects/tradevibe-org/insight_engine/insight_engine_v3.py

  # 2️⃣ Generate music playlist
  /usr/bin/python3 /home/nexus/projects/tradevibe-org/insight_engine/music_recommender_v3.py

  echo "✅ Completed TradeVibe daily generation"
  echo
} >> "$LOGFILE" 2>&1
