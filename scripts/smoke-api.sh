#!/bin/bash
set -euo pipefail

BASE_URL="${BASE_URL:-${TRADEVIBE_BASE_URL:-http://127.0.0.1:3100}}"
MAX_VOICE_CHARS=501
MAX_TIFA_CHARS=2001
LONG_TEXT=$(head -c ${MAX_VOICE_CHARS} < /dev/zero | tr '\0' 'a')
LONG_TIFA_TEXT=$(head -c ${MAX_TIFA_CHARS} < /dev/zero | tr '\0' 'a')

echo "Smoke Test Target: ${BASE_URL}"
echo "--------------------------------------"

# Helper to check status codes
assert_status() {
  local endpoint=$1
  local expected_status=$2
  shift 2
  local response
  local http_status

  echo -n "Checking $endpoint..."
  response=$(curl -s -o /dev/null -w "%{http_code}" "$@")
  http_status=$response

  if [[ "$http_status" == "$expected_status" ]]; then
    echo " ✅ OK ($http_status)"
  else
    echo " ❌ FAIL (Expected $expected_status, got $http_status)"
    exit 1
  fi
}

extract_json_field() {
  local file_path=$1
  local field_name=$2

  node -e "
const fs = require('fs');
const data = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));
const value = data[process.argv[2]];
if (typeof value !== 'string' || value.length === 0) process.exit(1);
process.stdout.write(value);
" "$file_path" "$field_name"
}

# --- Health Check ---
echo "1. Health Endpoint"
echo -n "Checking /api/health..."
temp_file=$(mktemp)
http_status=$(curl -s -o "$temp_file" -w "%{http_code}" "${BASE_URL}/api/health")

if [[ "$http_status" == "200" || "$http_status" == "503" ]]; then
  if grep -q '"status"' "$temp_file"; then
    echo " ✅ OK ($http_status)"
  else
    echo " ❌ FAIL (Valid status $http_status, but no 'status' field in JSON)"
    rm -f "$temp_file"
    exit 1
  fi
else
  echo " ❌ FAIL (Expected 200 or 503, got $http_status)"
  rm -f "$temp_file"
  exit 1
fi
rm -f "$temp_file"
echo ""

# --- Tifa API Validation ---
echo "2. Tifa API Validation"
assert_status "POST /api/tifa (Invalid JSON)" "400" -X POST -H "Content-Type: application/json" -d '{"message":"hello"' "${BASE_URL}/api/tifa"
assert_status "POST /api/tifa (Empty Message)" "400" -X POST -H "Content-Type: application/json" -d '{"message":""}' "${BASE_URL}/api/tifa"
assert_status "POST /api/tifa (Too Long)" "413" -X POST -H "Content-Type: application/json" -d "{\"message\":\"${LONG_TIFA_TEXT}\"}" "${BASE_URL}/api/tifa"
echo ""

# --- Tifa API Streaming Validation ---
echo "3. Tifa API Streaming Validation"
assert_status "POST /api/tifa/stream (Invalid JSON)" "400" -X POST -H "Content-Type: application/json" -d '{"message":"hello"' "${BASE_URL}/api/tifa/stream"
assert_status "POST /api/tifa/stream (Empty Message)" "400" -X POST -H "Content-Type: application/json" -d '{"message":""}' "${BASE_URL}/api/tifa/stream"
assert_status "POST /api/tifa/stream (Too Long)" "413" -X POST -H "Content-Type: application/json" -d "{\"message\":\"${LONG_TIFA_TEXT}\"}" "${BASE_URL}/api/tifa/stream"
echo ""

# --- Voice API Validation ---
echo "4. Voice API Validation"
assert_status "GET /api/voice (Empty Text)" "400" "${BASE_URL}/api/voice?text="
assert_status "GET /api/voice (Too Long)" "413" "${BASE_URL}/api/voice?text=${LONG_TEXT}"
echo ""

# --- Voice Job API Validation ---
echo "5. Voice Job API Validation"
assert_status "POST /api/voice/jobs (Invalid JSON)" "400" -X POST -H "Content-Type: application/json" -d '{"text":"hello"' "${BASE_URL}/api/voice/jobs"
assert_status "POST /api/voice/jobs (Empty Text)" "400" -X POST -H "Content-Type: application/json" -d '{"text":""}' "${BASE_URL}/api/voice/jobs"
assert_status "POST /api/voice/jobs (Too Long)" "413" -X POST -H "Content-Type: application/json" -d "{\"text\":\"${LONG_TEXT}\"}" "${BASE_URL}/api/voice/jobs"
assert_status "GET /api/voice/jobs/nonexistent_job" "404" "${BASE_URL}/api/voice/jobs/nonexistent_job"
assert_status "GET /api/voice/jobs/nonexistent_job/audio" "404" "${BASE_URL}/api/voice/jobs/nonexistent_job/audio"
echo ""

# --- Voice Job Lifecycle Without Live Piper ---
echo "6. Voice Job Lifecycle"
echo -n "Checking POST /api/voice/jobs (Queued or Cached)..."
voice_job_response=$(mktemp)
voice_job_text="Voice job validation smoke $(date +%s)"
voice_job_status=$(curl -s -o "$voice_job_response" -w "%{http_code}" -X POST -H "Content-Type: application/json" -d "{\"text\":\"${voice_job_text}\"}" "${BASE_URL}/api/voice/jobs")
if [[ "$voice_job_status" == "200" || "$voice_job_status" == "202" ]]; then
  validation_job_id=$(extract_json_field "$voice_job_response" "job_id")
  validation_job_status=$(extract_json_field "$voice_job_response" "status")
  echo " ✅ OK ($voice_job_status, $validation_job_id, $validation_job_status)"
else
  echo " ❌ FAIL (Expected 200 or 202, got $voice_job_status)"
  cat "$voice_job_response"
  rm -f "$voice_job_response"
  exit 1
fi
rm -f "$voice_job_response"

assert_status "GET /api/voice/jobs/{jobId}" "200" "${BASE_URL}/api/voice/jobs/${validation_job_id}"
if [[ "$validation_job_status" == "ready" ]]; then
  assert_status "GET /api/voice/jobs/{jobId}/audio" "200" "${BASE_URL}/api/voice/jobs/${validation_job_id}/audio"
else
  echo "Voice job ${validation_job_id} is ${validation_job_status}; run npm run tts:worker:once to process local queued jobs."
fi
echo ""

# --- Chat History API Validation ---
echo "7. Chat History API Validation"
assert_status "POST /api/chat/sessions (Invalid JSON)" "400" -X POST -H "Content-Type: application/json" -d '{"mood":"focused"' "${BASE_URL}/api/chat/sessions"
assert_status "GET /api/chat/sessions invalid id" "400" "${BASE_URL}/api/chat/sessions/not_a_session"
assert_status "GET /api/chat/sessions nonexistent" "404" "${BASE_URL}/api/chat/sessions/session_00000000-0000-4000-8000-000000000000"

chat_session_response=$(mktemp)
chat_session_status=$(curl -s -o "$chat_session_response" -w "%{http_code}" -X POST -H "Content-Type: application/json" -d '{"mood":"focused","title":"Smoke"}' "${BASE_URL}/api/chat/sessions")
if [[ "$chat_session_status" == "200" ]]; then
  chat_session_id=$(extract_json_field "$chat_session_response" "id")
  echo "Checking POST /api/chat/sessions... ✅ OK (200, $chat_session_id)"
else
  echo "Checking POST /api/chat/sessions... ❌ FAIL (Expected 200, got $chat_session_status)"
  rm -f "$chat_session_response"
  exit 1
fi
rm -f "$chat_session_response"

assert_status "GET /api/chat/sessions/{sessionId}" "200" "${BASE_URL}/api/chat/sessions/${chat_session_id}"
assert_status "POST /api/chat/sessions/{sessionId}/messages (Empty Content)" "400" -X POST -H "Content-Type: application/json" -d '{"role":"user","content":""}' "${BASE_URL}/api/chat/sessions/${chat_session_id}/messages"
assert_status "POST /api/chat/sessions/{sessionId}/messages" "200" -X POST -H "Content-Type: application/json" -d '{"role":"user","content":"hello"}' "${BASE_URL}/api/chat/sessions/${chat_session_id}/messages"
assert_status "GET /api/chat/sessions/{sessionId}/messages" "200" "${BASE_URL}/api/chat/sessions/${chat_session_id}/messages"
echo ""


if [[ "${RUN_LIVE_SMOKE:-0}" == "1" ]]; then
  echo "8. Live API Checks (RUN_LIVE_SMOKE=1)"
  assert_status "POST /api/tifa (Live)" "200" -X POST -H "Content-Type: application/json" -d '{"message":"Hello Tifa"}' "${BASE_URL}/api/tifa"
  assert_status "GET /api/voice (Live)" "200" "${BASE_URL}/api/voice?text=Hello"

  echo -n "Checking POST /api/tifa/stream (Live)..."
  # Live stream check just confirms it opens with a 200
  status_stream=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d '{"message":"Hello Tifa Stream"}' "${BASE_URL}/api/tifa/stream")
  if [[ "$status_stream" == "200" ]]; then
    echo " ✅ OK (200)"
  else
    echo " ❌ FAIL (Expected 200, got $status_stream)"
    exit 1
  fi

  echo -n "Checking POST /api/voice/jobs (Live)..."
  voice_job_response=$(mktemp)
  voice_job_text="Hello voice job smoke $(date +%s)"
  voice_job_status=$(curl -s -o "$voice_job_response" -w "%{http_code}" -X POST -H "Content-Type: application/json" -d "{\"text\":\"${voice_job_text}\"}" "${BASE_URL}/api/voice/jobs")
  if [[ "$voice_job_status" == "200" || "$voice_job_status" == "202" ]]; then
    job_id=$(extract_json_field "$voice_job_response" "job_id")
    job_status=$(extract_json_field "$voice_job_response" "status")
    echo " ✅ OK ($voice_job_status, $job_id, $job_status)"
  else
    echo " ❌ FAIL (Expected 200 or 202, got $voice_job_status)"
    rm -f "$voice_job_response"
    exit 1
  fi
  rm -f "$voice_job_response"

  assert_status "GET /api/voice/jobs/{jobId} (Live)" "200" "${BASE_URL}/api/voice/jobs/${job_id}"

  if [[ "$job_status" == "queued" || "$job_status" == "processing" ]]; then
    echo -n "Checking TTS worker once..."
    if npm run -s tts:worker:once >/tmp/tradevibe-tts-worker-smoke.log 2>&1; then
      echo " ✅ OK"
    else
      echo " ❌ FAIL"
      cat /tmp/tradevibe-tts-worker-smoke.log
      rm -f /tmp/tradevibe-tts-worker-smoke.log
      exit 1
    fi
    rm -f /tmp/tradevibe-tts-worker-smoke.log
  fi

  echo -n "Checking voice job ready status..."
  job_ready="0"
  job_status_file=$(mktemp)
  for _ in {1..10}; do
    curl -s -o "$job_status_file" "${BASE_URL}/api/voice/jobs/${job_id}"
    current_status=$(extract_json_field "$job_status_file" "status")
    if [[ "$current_status" == "ready" ]]; then
      job_ready="1"
      break
    fi
    if [[ "$current_status" == "failed" ]]; then
      echo " ❌ FAIL (job failed)"
      cat "$job_status_file"
      rm -f "$job_status_file"
      exit 1
    fi
    sleep 1
  done
  rm -f "$job_status_file"
  if [[ "$job_ready" == "1" ]]; then
    echo " ✅ OK (ready)"
  else
    echo " ❌ FAIL (job did not become ready)"
    exit 1
  fi

  echo -n "Checking GET /api/voice/jobs/{jobId}/audio (Live)..."
  audio_file="/tmp/tradevibe-voice-job-smoke.wav"
  audio_status=$(curl -s -o "$audio_file" -w "%{http_code}" "${BASE_URL}/api/voice/jobs/${job_id}/audio")
  if [[ "$audio_status" != "200" ]]; then
    echo " ❌ FAIL (Expected 200, got $audio_status)"
    rm -f "$audio_file"
    exit 1
  fi
  if [[ ! -s "$audio_file" ]]; then
    echo " ❌ FAIL (Audio file missing or empty)"
    rm -f "$audio_file"
    exit 1
  fi
  if command -v file >/dev/null 2>&1; then
    if file "$audio_file" | grep -qi "WAVE audio"; then
      echo " ✅ OK (audio/wav)"
    else
      echo " ❌ FAIL (Generated file is not WAV audio)"
      file "$audio_file"
      rm -f "$audio_file"
      exit 1
    fi
  else
    echo " ✅ OK (non-empty audio file)"
  fi
  rm -f "$audio_file"
  echo ""
else
    echo "8. Skipping Live API Checks (set RUN_LIVE_SMOKE=1 to run)"
fi

if [[ "${RUN_RATE_LIMIT_SMOKE:-0}" == "1" ]]; then
  echo ""
  echo "9. Rate Limit Checks (RUN_RATE_LIMIT_SMOKE=1)"
  echo "   (Assumes app running with low limits, e.g., *_RATE_LIMIT_MAX=1)"

  # Test Tifa rate limit
  echo -n "Checking POST /api/tifa (Rate Limit)..."
  # First request (may be 200 or 5xx, we don't care about the status)
  curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d '{"message":"limit test 1"}' "${BASE_URL}/api/tifa" > /dev/null
  # Second request (should be 429)
  status_tifa=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d '{"message":"limit test 2"}' "${BASE_URL}/api/tifa")
  if [[ "$status_tifa" == "429" ]]; then
    echo " ✅ OK (429)"
  else
    echo " ❌ FAIL (Expected 429, got $status_tifa)"
    exit 1
  fi

  # Test Voice rate limit
  echo -n "Checking GET /api/voice (Rate Limit)..."
  # First request
  curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/voice?text=limit-test-1" > /dev/null
  # Second request
  status_voice=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/voice?text=limit-test-2")
  if [[ "$status_voice" == "429" ]]; then
    echo " ✅ OK (429)"
  else
    echo " ❌ FAIL (Expected 429, got $status_voice)"
    exit 1
  fi
else
    echo ""
    echo "9. Skipping Rate Limit Checks (set RUN_RATE_LIMIT_SMOKE=1 to run)"
fi


echo "--------------------------------------"
echo "✅ All smoke tests passed."
