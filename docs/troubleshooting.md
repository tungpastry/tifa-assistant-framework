# TradeVibe Troubleshooting Guide

This guide helps debug the current TradeVibe codebase: a **local-first, single-node, self-hosted AI trader companion** using Next.js, local runtime artifacts, Ollama, Piper TTS, ChatTifa streaming, and cache-first voice jobs.

Use this guide from the repo root:

```bash
cd /home/nexus/projects/tradevibe-org
```

---

## 1. First Diagnostic Checklist

Run these commands first:

```bash
pwd
git status --short
node -v
npm -v
python3 --version
```

Check app scripts:

```bash
node -e "const p=require('./package.json'); console.log(JSON.stringify(p.scripts,null,2))"
```

Check `.env` exists:

```bash
test -f .env && echo "OK: .env exists" || echo "MISSING: .env"
```

Check runtime directories:

```bash
find runtime -maxdepth 2 -type d | sort
```

Check local services:

```bash
curl -s http://127.0.0.1:11434/api/tags | jq
test -x "${PIPER_BIN:-/home/nexus/piper-env/bin/piper}" && echo "OK: Piper binary executable"
test -f "${PIPER_MODEL:-/home/nexus/piper/voices/en_US-libritts-high.onnx}" && echo "OK: Piper model exists"
```

Check TradeVibe health:

```bash
curl -s http://127.0.0.1:3100/api/health | jq
```

Run smoke tests:

```bash
npm run smoke:api
```

---

## 2. Next.js App Does Not Start

### Symptoms

- `npm run dev` fails.
- `npm run start` fails.
- Browser cannot open `http://127.0.0.1:3100`.
- PM2 process exits immediately.

### Common Causes

1. Node.js version is too old.
2. Dependencies are not installed.
3. `runtime/` directory is missing.
4. `.env` is missing or invalid.
5. Port `3100` is already in use.
6. Build artifacts are stale or missing.

### Fix

Check Node.js:

```bash
node -v
```

Install dependencies:

```bash
npm ci
```

Prepare runtime:

```bash
bash scripts/prepare-runtime.sh
```

Check port:

```bash
ss -ltnp | grep ':3100' || true
```

Run development server:

```bash
npm run dev
```

Build production app:

```bash
npm run build
```

Start production app:

```bash
npm run start
```

If using PM2:

```bash
pm2 status
pm2 logs tradevibe --lines 100
pm2 restart tradevibe
```

---

## 3. `runtime/` Directory Is Missing or Incomplete

### Symptoms

- `/api/today` fails.
- `/api/health` reports runtime issues.
- Daily vibe dashboard does not load.
- Voice jobs fail because `runtime/audio_cache` or `runtime/tts_jobs` is missing.

### Expected Runtime Layout

```text
runtime/
├─ latest.json
├─ daily_vibes/
├─ logs/
├─ audio_cache/
└─ tts_jobs/
```

### Fix

Run:

```bash
bash scripts/prepare-runtime.sh
```

Verify:

```bash
find runtime -maxdepth 2 -type d | sort
```

If needed, create directories manually:

```bash
mkdir -p runtime/daily_vibes runtime/logs runtime/audio_cache runtime/tts_jobs
```

---

## 4. `/api/health` Returns `down` or `degraded`

### Symptoms

```bash
curl -s http://127.0.0.1:3100/api/health | jq
```

returns:

```json
{
  "status": "degraded"
}
```

or:

```json
{
  "status": "down"
}
```

### Common Causes

- Runtime directories are missing.
- Ollama is down.
- Piper binary is missing.
- Piper model file is missing.
- `.env` points to wrong paths.

### Fix Runtime

```bash
bash scripts/prepare-runtime.sh
find runtime -maxdepth 2 -type d | sort
```

### Fix Ollama

```bash
systemctl status ollama --no-pager || true
curl -s http://127.0.0.1:11434/api/tags | jq
ollama list
```

If the model is missing:

```bash
ollama pull gemma3:1b
```

### Fix Piper

```bash
set -a
source .env
set +a

test -x "$PIPER_BIN" && echo "OK: $PIPER_BIN"
test -f "$PIPER_MODEL" && echo "OK: $PIPER_MODEL"
```

Manual Piper test:

```bash
echo "Hello trader" | "$PIPER_BIN" \
  --model "$PIPER_MODEL" \
  --output_file /tmp/tradevibe-piper-test.wav

file /tmp/tradevibe-piper-test.wav
rm -f /tmp/tradevibe-piper-test.wav
```

---

## 5. `/api/today` Fails or Daily Vibe Does Not Load

### Symptoms

- Dashboard stuck on loading.
- `/api/today` returns `500`.
- Mood, quote, playlist, or audio is empty.
- `runtime/latest.json` is missing.
- `runtime/daily_vibes/` has no generated files.

### Check

```bash
curl -s http://127.0.0.1:3100/api/today | jq
```

Inspect runtime:

```bash
ls -lah runtime
ls -lah runtime/daily_vibes
test -f runtime/latest.json && cat runtime/latest.json | jq
```

### Common Causes

1. Python Insight Engine has not run yet.
2. `runtime/latest.json` is missing.
3. Files referenced by `runtime/latest.json` do not exist.
4. `runtime/daily_vibes/` has no fallback artifacts.
5. Generated audio file is missing.

### Fix

Run the insight pipeline manually:

```bash
bash insight_engine/tradevibe_runner.sh
```

Check generated files:

```bash
find runtime/daily_vibes -maxdepth 1 -type f | sort | tail -30
test -f runtime/latest.json && cat runtime/latest.json | jq
```

Restart app if needed:

```bash
pm2 restart tradevibe || true
```

Then test:

```bash
curl -s http://127.0.0.1:3100/api/today | jq
```

---

## 6. Daily Vibe Audio Does Not Play

### Symptoms

- Mood and quote load, but audio is missing.
- Browser shows audio control but playback fails.
- Browser console shows autoplay warning.
- `/api/today` returns `"audio": null`.

### Common Causes

1. Daily WAV file was not generated.
2. `runtime/latest.json` points to a missing audio file.
3. Browser blocked autoplay.
4. Audio file is invalid or empty.

### Check

```bash
curl -s http://127.0.0.1:3100/api/today | jq '.audio != null'
cat runtime/latest.json | jq
find runtime/daily_vibes -maxdepth 1 -name '*.wav' -ls
```

### Fix

Regenerate daily artifacts:

```bash
bash insight_engine/tradevibe_runner.sh
```

Check WAV:

```bash
find runtime/daily_vibes -maxdepth 1 -name '*.wav' -print -exec file {} \;
```

If browser blocks autoplay, this is expected. Manually click the audio control.

---

## 7. ChatTifa Does Not Respond

### Symptoms

- ChatTifa keeps typing forever.
- Tifa reply never appears.
- Error banner appears in widget.
- `/api/tifa` returns `502`, `504`, or `500`.

### Check Non-Streaming Endpoint

```bash
curl -s -X POST http://127.0.0.1:3100/api/tifa \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello Tifa","mood":"focused"}' | jq
```

### Common Causes

1. Ollama is not running.
2. `TIFA_API_URL` is wrong.
3. `TIFA_MODEL` is missing locally.
4. `TIFA_TIMEOUT_MS` is too short.
5. Prompt file path is wrong.
6. Rate limit has been triggered.

### Fix Ollama

```bash
systemctl status ollama --no-pager || true
curl -s http://127.0.0.1:11434/api/tags | jq
ollama list
```

Pull model if missing:

```bash
ollama pull gemma3:1b
```

Test Ollama directly:

```bash
curl -s http://127.0.0.1:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{"model":"gemma3:1b","prompt":"Say hello.","stream":false}' | jq
```

Check `.env`:

```bash
grep -n '^TIFA_' .env
```

Increase timeout if needed:

```env
TIFA_TIMEOUT_MS=30000
```

Restart app after editing `.env`.

---

## 8. ChatTifa Streaming Is Interrupted or Incomplete

### Symptoms

- Tifa starts replying, then stops.
- UI says the stream was interrupted.
- Browser console shows `Stream failed, considering fallback`.
- `/api/tifa/stream` opens but does not emit `done`.

### Check Streaming Endpoint

```bash
curl -N -X POST http://127.0.0.1:3100/api/tifa/stream \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello Tifa stream","mood":"focused"}'
```

Expected events:

```text
event: start
event: delta
event: done
```

### Common Causes

1. Ollama stream ended unexpectedly.
2. Connection was interrupted.
3. Upstream model timed out.
4. SSE chunk parsing failed.
5. Reverse proxy buffered streaming output.
6. Browser request was aborted.

### Fix

Check server logs:

```bash
pm2 logs tradevibe --lines 150 || true
```

Check direct non-streaming fallback:

```bash
curl -s -X POST http://127.0.0.1:3100/api/tifa \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello Tifa fallback","mood":"focused"}' | jq
```

Increase timeout:

```env
TIFA_TIMEOUT_MS=30000
```

Restart app:

```bash
pm2 restart tradevibe || true
```

If using a reverse proxy, make sure streaming is not buffered.

---

## 9. ChatTifa Voice Does Not Play

### Symptoms

- Tifa text reply appears, but no voice.
- Browser console shows voice playback error.
- Voice toggle is on, but no audio.
- Voice job path fails and fallback also fails.

### Current Voice Flow

```text
playTifaVoice()
→ try /api/voice/jobs
→ fetch /api/voice/jobs/{jobId}/audio
→ if failed, fallback to /api/voice?text=...
```

### Check Voice Job

```bash
curl -s -X POST http://127.0.0.1:3100/api/voice/jobs \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello trader","voice":"tifa-default","format":"wav"}' | jq
```

Copy the returned `job_id`, then:

```bash
JOB_ID="replace_with_real_job_id"

curl -s "http://127.0.0.1:3100/api/voice/jobs/${JOB_ID}" | jq

curl -s "http://127.0.0.1:3100/api/voice/jobs/${JOB_ID}/audio" \
  -o /tmp/tifa-voice.wav

file /tmp/tifa-voice.wav
ls -lh /tmp/tifa-voice.wav
```

### Check Legacy Voice Fallback

```bash
curl -s "http://127.0.0.1:3100/api/voice?text=Hello%20trader" | jq '.audio != null'
```

### Common Causes

1. Piper binary path is wrong.
2. Piper model path is wrong.
3. Piper timed out.
4. Browser blocked playback until user interaction.
5. Text is longer than 500 characters.
6. Rate limit triggered.
7. Voice job record or cache file is missing.

### Fix

Check Piper:

```bash
set -a
source .env
set +a

test -x "$PIPER_BIN" && echo "OK: PIPER_BIN"
test -f "$PIPER_MODEL" && echo "OK: PIPER_MODEL"
```

Manual Piper test:

```bash
echo "Hello trader" | "$PIPER_BIN" \
  --model "$PIPER_MODEL" \
  --output_file /tmp/tradevibe-piper-test.wav

file /tmp/tradevibe-piper-test.wav
rm -f /tmp/tradevibe-piper-test.wav
```

Increase Piper timeout if needed:

```env
PIPER_TIMEOUT_MS=15000
```

Restart app after changing `.env`.

---

## 10. Voice Job Returns Ready but Audio Endpoint Returns 404

### Symptoms

- `POST /api/voice/jobs` returns `status: ready`.
- `GET /api/voice/jobs/{jobId}` returns job record.
- `GET /api/voice/jobs/{jobId}/audio` returns 404.
- Browser cannot play cached Tifa voice.

### Check Job and Cache

```bash
JOB_ID="replace_with_real_job_id"

cat "runtime/tts_jobs/${JOB_ID}.json" | jq

CACHE_KEY="$(cat "runtime/tts_jobs/${JOB_ID}.json" | jq -r '.cache_key')"

echo "$CACHE_KEY"

ls -lah "runtime/audio_cache/${CACHE_KEY}.wav"
ls -lah "runtime/audio_cache/${CACHE_KEY}.json"
```

### Common Causes

1. Job record exists but cached WAV file is missing.
2. Cache metadata exists but WAV file was deleted.
3. Runtime cleanup removed audio but not job record.
4. Permissions prevent the app from reading cache files.

### Fix

Regenerate the voice job:

```bash
curl -s -X POST http://127.0.0.1:3100/api/voice/jobs \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello trader","voice":"tifa-default","format":"wav"}' | jq
```

Check permissions:

```bash
ls -lah runtime/audio_cache runtime/tts_jobs
```

If cache is inconsistent, remove the broken job record and regenerate:

```bash
rm -f "runtime/tts_jobs/${JOB_ID}.json"
```

---

## 11. Voice Generation Is Slow

### Symptoms

- First voice request is slow.
- `/api/voice/jobs` takes several seconds.
- ChatTifa voice plays late after text appears.

### Current Implementation Detail

The voice job API is cache-first and job-shaped, but cache misses are still generated synchronously inside the request. The first request for a new text/voice/model combination may be slow. Repeated requests should be faster because they hit `runtime/audio_cache`.

### Check Cache

```bash
find runtime/audio_cache -maxdepth 1 -type f | sort | tail -20
find runtime/tts_jobs -maxdepth 1 -type f | sort | tail -20
```

### Fix Options

1. Increase `PIPER_TIMEOUT_MS`.
2. Reuse common short phrases to benefit from cache.
3. Keep reply text under 500 characters for current TTS route.
4. Future improvement: move cache-miss generation to a real background worker queue.

---

## 12. Voice or Tifa Returns `429 RATE_LIMITED`

### Symptoms

API returns:

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests.",
    "retryable": true,
    "details": {
      "retry_after_seconds": 60
    }
  }
}
```

### Common Causes

- Too many chat requests in the rate-limit window.
- Too many voice requests in the rate-limit window.
- Smoke test or manual curl loop triggered rate limiting.
- Browser auto-retry created repeated requests.

### Check `.env`

```bash
grep -n 'RATE_LIMIT' .env
```

### Current Defaults

```env
TIFA_RATE_LIMIT_WINDOW_MS=60000
TIFA_RATE_LIMIT_MAX=20
VOICE_RATE_LIMIT_WINDOW_MS=60000
VOICE_RATE_LIMIT_MAX=10
```

### Fix

Wait for the retry window to reset, or temporarily increase limits in `.env` for local testing.

Restart app after `.env` changes:

```bash
pm2 restart tradevibe || true
```

Important:

> The current limiter is in-memory and process-local. It is not suitable for distributed production rate limiting.

---

## 13. Browser Blocks Autoplay

### Symptoms

- Browser console shows autoplay warning.
- Daily vibe audio does not auto-play.
- Tifa voice does not play until the user interacts with the page.

### Cause

Most browsers block autoplay until the user interacts with the page.

### Fix

This is expected. Click the page or the visible audio control, then retry.

For debugging, confirm that the audio endpoint works:

```bash
curl -s "http://127.0.0.1:3100/api/voice?text=Hello%20trader" | jq '.audio != null'
```

---

## 14. `npm run smoke:api` Fails

### Symptoms

- Smoke test exits early.
- Validation status code differs from expected.
- Health endpoint does not return a `status` field.
- Live checks fail.

### Run Basic Smoke

```bash
npm run smoke:api
```

### Run Live Smoke

```bash
RUN_LIVE_SMOKE=1 npm run smoke:api
```

### Run Rate-Limit Smoke

```bash
RUN_RATE_LIMIT_SMOKE=1 npm run smoke:api
```

### Common Causes

1. App is not running on `127.0.0.1:3100`.
2. `TRADEVIBE_BASE_URL` points to wrong URL.
3. Ollama is down.
4. Piper is misconfigured.
5. Rate limit already triggered.
6. Health endpoint is degraded/down.

### Fix

Set target explicitly:

```bash
TRADEVIBE_BASE_URL=http://127.0.0.1:3100 npm run smoke:api
```

Check app:

```bash
curl -s http://127.0.0.1:3100/api/health | jq
```

Check logs:

```bash
pm2 logs tradevibe --lines 100 || true
```

---

## 15. PM2 App Is Running but Old Code Still Appears

### Symptoms

- README/docs updated but app behavior unchanged.
- Code was pulled but PM2 still serves old build.
- Browser shows stale UI.

### Fix

Rebuild and restart:

```bash
npm ci
npm run build
pm2 restart tradevibe
```

Check logs:

```bash
pm2 logs tradevibe --lines 100
```

Clear browser cache or hard refresh.

---

## 16. Port `3100` Is Already in Use

### Symptoms

- Next.js cannot start.
- Error mentions address already in use.
- `npm run dev` or `npm run start` fails.

### Check

```bash
ss -ltnp | grep ':3100' || true
```

### Fix

If PM2 already runs the app:

```bash
pm2 status
pm2 restart tradevibe
```

If another process owns port `3100`, stop it safely:

```bash
ps aux | grep 3100
```

Then stop the correct process.

---

## 17. `.env` Changes Do Not Apply

### Symptoms

- You changed `TIFA_MODEL`, `TIFA_TIMEOUT_MS`, `PIPER_MODEL`, or rate limits, but behavior is unchanged.

### Cause

The running Node process does not reload `.env` automatically.

### Fix

Restart the app:

```bash
pm2 restart tradevibe || true
```

For direct run, stop and start again:

```bash
npm run start
```

Verify `.env` values:

```bash
grep -n 'TIFA_\|PIPER_\|RATE_LIMIT\|TRADEVIBE_' .env
```

---

## 18. Runtime Cache Grows Too Large

### Symptoms

- Disk usage grows.
- `runtime/audio_cache/` has many `.wav` files.
- `runtime/tts_jobs/` has many job records.

### Check Disk Usage

```bash
du -h -d 2 runtime | sort -h
```

Check recent files:

```bash
find runtime/audio_cache -maxdepth 1 -type f -printf '%TY-%Tm-%Td %TH:%TM %s %p\n' | sort | tail -30
find runtime/tts_jobs -maxdepth 1 -type f -printf '%TY-%Tm-%Td %TH:%TM %s %p\n' | sort | tail -30
```

### Safe Manual Cleanup Example

Remove old TTS job records older than 30 days:

```bash
find runtime/tts_jobs -type f -name '*.json' -mtime +30 -print
```

After reviewing, delete:

```bash
find runtime/tts_jobs -type f -name '*.json' -mtime +30 -delete
```

Remove old audio cache files older than 30 days:

```bash
find runtime/audio_cache -type f -mtime +30 -print
```

After reviewing, delete:

```bash
find runtime/audio_cache -type f -mtime +30 -delete
```

Important:

> If you delete audio cache files but keep old ready job records, old job audio URLs may return 404. For now, clean cache and job records together.

---

## 19. Git Working Tree Has Backup Files

### Symptoms

`git status --short` shows files like:

```text
?? docs/troubleshooting.md.bak.20260429_...
?? README.md.bak.20260429_...
```

### Fix

After confirming docs are correct, remove backup files:

```bash
rm -f README.md.bak.*
rm -f CHANGELOG.md.bak.*
rm -f docs/*.bak.*
```

Check:

```bash
git status --short
```

---

## 20. Recommended Final Validation

After docs or code changes:

```bash
npm run lint
npm run build
npm run smoke:api
git diff --check
```

For live local AI/TTS checks:

```bash
RUN_LIVE_SMOKE=1 npm run smoke:api
```

For API manual checks:

```bash
curl -s http://127.0.0.1:3100/api/health | jq

curl -s -X POST http://127.0.0.1:3100/api/tifa \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello Tifa","mood":"focused"}' | jq

curl -N -X POST http://127.0.0.1:3100/api/tifa/stream \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello Tifa stream","mood":"focused"}'
```
