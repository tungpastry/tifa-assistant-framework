#!/bin/bash
set -euo pipefail

BASE_URL="${TRADEVIBE_BASE_URL:-http://127.0.0.1:3100}"
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

# --- Health Check ---
echo "1. Health Endpoint"
assert_status "/api/health" "200" "${BASE_URL}/api/health"
echo ""

# --- Tifa API Validation ---
echo "2. Tifa API Validation"
assert_status "POST /api/tifa (Invalid JSON)" "400" -X POST -H "Content-Type: application/json" -d '{"message":"hello"' "${BASE_URL}/api/tifa"
assert_status "POST /api/tifa (Empty Message)" "400" -X POST -H "Content-Type: application/json" -d '{"message":""}' "${BASE_URL}/api/tifa"
assert_status "POST /api/tifa (Too Long)" "413" -X POST -H "Content-Type: application/json" -d "{"message":"${LONG_TIFA_TEXT}"}" "${BASE_URL}/api/tifa"
echo ""

# --- Voice API Validation ---
echo "3. Voice API Validation"
assert_status "GET /api/voice (Empty Text)" "400" "${BASE_URL}/api/voice?text="
assert_status "GET /api/voice (Too Long)" "413" "${BASE_URL}/api/voice?text=${LONG_TEXT}"
echo ""


if [[ "${RUN_LIVE_SMOKE:-0}" == "1" ]]; then
  echo "4. Live API Checks (RUN_LIVE_SMOKE=1)"
  assert_status "POST /api/tifa (Live)" "200" -X POST -H "Content-Type: application/json" -d '{"message":"Hello Tifa"}' "${BASE_URL}/api/tifa"
  assert_status "GET /api/voice (Live)" "200" "${BASE_URL}/api/voice?text=Hello"
  echo ""
else
    echo "4. Skipping Live API Checks (set RUN_LIVE_SMOKE=1 to run)"
fi


echo "--------------------------------------"
echo "✅ All smoke tests passed."
