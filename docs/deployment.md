# TradeVibe Deployment Guide

This guide describes how to deploy the current TradeVibe codebase as a **local-first, single-node, self-hosted AI trader companion**.

TradeVibe currently depends on:

- Next.js web app
- Local runtime filesystem artifacts
- Local Ollama-compatible API
- Local Piper TTS binary
- Python Insight Engine
- Optional PM2 process manager
- Optional systemd timer for the daily insight pipeline

This guide intentionally documents the current implementation. TradeVibe is not yet a multi-instance SaaS deployment.

---

## 1. Deployment Profile

Current supported profile:

| Area | Current Deployment Target |
|---|---|
| Host OS | Ubuntu/Debian Linux server recommended |
| Web app | Next.js App Router |
| App port | `3100` by default |
| AI chat | Local Ollama-compatible endpoint |
| TTS | Local Piper binary |
| Runtime state | Local filesystem under `runtime/` |
| Audio cache | Local filesystem under `runtime/audio_cache/` |
| Voice jobs | Local filesystem under `runtime/tts_jobs/` |
| Rate limit | In-memory process-local limiter |
| Production manager | PM2 or direct `npm run start` |
| Daily pipeline | systemd timer or manual script |

Important limitation:

> Runtime artifacts, TTS cache, voice job records, and rate-limit buckets are local to one machine/process. For multi-instance production, replace these with Redis, database-backed state, object storage, or platform-level services.

---

## 2. Prerequisites

Install or verify:

```bash
node -v
npm -v
python3 --version
git --version
```

Required versions:

| Dependency | Required |
|---|---|
| Node.js | `>=18.18.0` |
| npm | compatible with installed Node.js |
| Python | `>=3.10` |
| Ollama | installed and running locally |
| Piper | local binary available |
| Piper model | local `.onnx` model available |

Optional:

```bash
npm install -g pm2
```

---

## 3. Clone and Enter Repo

```bash
cd /home/nexus/projects

git clone git@github.com:tungpastry/tradevibe-org.git

cd /home/nexus/projects/tradevibe-org
```

If the repo already exists:

```bash
cd /home/nexus/projects/tradevibe-org
git status --short
git pull --ff-only
```

---

## 4. Environment Configuration

Create `.env` from the template:

```bash
cp .env.example .env
```

Edit `.env`:

```bash
nano .env
```

Core variables:

```env
TRADEVIBE_TIMEZONE=Asia/Ho_Chi_Minh
TRADEVIBE_RUNTIME_DIR=runtime
HOST=0.0.0.0
PORT=3100
```

Local AI variables:

```env
OLLAMA_URL=http://127.0.0.1:11434
TIFA_API_URL=http://127.0.0.1:11434/api/generate
TIFA_MODEL=gemma3:1b
TIFA_TIMEOUT_MS=20000
TIFA_PROMPT_PATH=prompts/TIFA_RUNTIME.md
```

Piper variables:

```env
PIPER_BIN=/home/nexus/piper-env/bin/piper
PIPER_MODEL=/home/nexus/piper/voices/en_US-libritts-high.onnx
PIPER_TIMEOUT_MS=10000
```

Rate-limit variables:

```env
TIFA_RATE_LIMIT_WINDOW_MS=60000
TIFA_RATE_LIMIT_MAX=20
VOICE_RATE_LIMIT_WINDOW_MS=60000
VOICE_RATE_LIMIT_MAX=10
```

Ops variable:

```env
TRADEVIBE_REPO_ROOT=/home/nexus/projects/tradevibe-org
```

Optional external API variables:

```env
QWEN_API_URL=
YOUTUBE_API_KEY=
SPOTIFY_CLIENT_ID=
SPOTIFY_SECRET=
```

---

## 5. Install Node Dependencies

```bash
cd /home/nexus/projects/tradevibe-org

npm ci
```

Verify package scripts:

```bash
npm run
```

Important scripts:

| Script | Purpose |
|---|---|
| `npm run dev` | Prepare runtime and run Next.js dev server on port `3100` |
| `npm run build` | Build Next.js app |
| `npm run start` | Start production app through `start.sh` |
| `npm run lint` | Run ESLint |
| `npm run check` | Run lint and build |
| `npm run smoke:api` | Run API smoke tests |
| `npm run cleanup:runtime` | Dry-run cleanup for runtime cache, jobs, and logs |
| `npm run tts:worker` | Run the local TTS worker loop |
| `npm run tts:worker:once` | Process queued TTS jobs once and exit |

---

## 6. Prepare Runtime Directories

TradeVibe uses a git-ignored `runtime/` directory.

Prepare it:

```bash
bash scripts/prepare-runtime.sh
```

Verify:

```bash
find runtime -maxdepth 2 -type d | sort
```

Expected layout:

```text
runtime/
runtime/audio_cache/
runtime/daily_vibes/
runtime/logs/
runtime/tts_jobs/
```

Runtime purposes:

| Path | Purpose |
|---|---|
| `runtime/latest.json` | Latest daily vibe manifest |
| `runtime/daily_vibes/` | Generated music/vibe/WAV artifacts |
| `runtime/logs/` | Runtime and pipeline logs |
| `runtime/audio_cache/` | Cached TTS WAV files and metadata |
| `runtime/tts_jobs/` | Filesystem voice job records |

---

## 7. Verify Ollama

Check Ollama service:

```bash
systemctl status ollama --no-pager || true
```

Check Ollama API:

```bash
curl -s http://127.0.0.1:11434/api/tags | jq
```

Check models:

```bash
ollama list
```

Pull the configured model if missing:

```bash
ollama pull gemma3:1b
```

Test the configured generate endpoint:

```bash
curl -s http://127.0.0.1:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{"model":"gemma3:1b","prompt":"Say hello in one short sentence.","stream":false}' | jq
```

If you use another model, update:

```env
TIFA_MODEL=your-model-name
```

---

## 8. Verify Piper

Load `.env` values into shell:

```bash
set -a
source .env
set +a
```

Check Piper binary and model:

```bash
test -x "$PIPER_BIN" && echo "OK: PIPER_BIN is executable: $PIPER_BIN"
test -f "$PIPER_MODEL" && echo "OK: PIPER_MODEL exists: $PIPER_MODEL"
```

Manual Piper smoke test:

```bash
echo "Hello trader" | "$PIPER_BIN" \
  --model "$PIPER_MODEL" \
  --output_file /tmp/tradevibe-piper-test.wav

file /tmp/tradevibe-piper-test.wav
ls -lh /tmp/tradevibe-piper-test.wav
```

Clean up:

```bash
rm -f /tmp/tradevibe-piper-test.wav
```

---

## 9. Development Run

Start development server:

```bash
npm run dev
```

Expected URL:

```text
http://127.0.0.1:3100
```

If accessing from another machine on LAN:

```text
http://<server-ip>:3100
```

Example:

```text
http://192.168.1.30:3100
```

---

## 10. Production Build and Direct Start

Build:

```bash
npm run build
```

Start:

```bash
npm run start
```

The production start script uses:

```text
start.sh
```

Check app:

```bash
curl -s http://127.0.0.1:3100/api/health | jq
```

---

## 11. PM2 Deployment

Install PM2 if needed:

```bash
npm install -g pm2
```

Build app:

```bash
cd /home/nexus/projects/tradevibe-org
npm run build
```

Start with PM2:

```bash
pm2 start ops/pm2/ecosystem.config.cjs
```

Save process list:

```bash
pm2 save
```

Generate startup command:

```bash
pm2 startup
```

Follow the command printed by PM2. It usually starts with `sudo env PATH=...`.

Useful PM2 commands:

```bash
pm2 status
pm2 logs tradevibe --lines 100
pm2 restart tradevibe
pm2 stop tradevibe
pm2 delete tradevibe
```

If the PM2 app name differs, inspect:

```bash
pm2 list
```

---

## 12. Daily Insight Pipeline Deployment

The Python Insight Engine can run manually or by systemd timer.

### Manual Run

```bash
cd /home/nexus/projects/tradevibe-org

bash insight_engine/tradevibe_runner.sh
```

Check generated runtime artifacts:

```bash
find runtime/daily_vibes -maxdepth 1 -type f | sort | tail -20
test -f runtime/latest.json && cat runtime/latest.json | jq
```

### Systemd Timer

Copy service and timer files:

```bash
sudo cp ops/systemd/tradevibe-insight.* /etc/systemd/system/
```

Reload systemd:

```bash
sudo systemctl daemon-reload
```

Enable timer:

```bash
sudo systemctl enable --now tradevibe-insight.timer
```

Check timer:

```bash
systemctl list-timers | grep tradevibe || true
systemctl status tradevibe-insight.timer --no-pager
```

View logs:

```bash
journalctl -u tradevibe-insight.service -n 100 --no-pager
```

Important:

> Enable the timer, not the service directly, to avoid duplicate scheduled runs.

---

## 13. Healthcheck

Health endpoint:

```bash
curl -s http://127.0.0.1:3100/api/health | jq
```

Expected status values:

```text
ok
degraded
down
```

HTTP behavior:

| HTTP Status | Meaning |
|---:|---|
| `200` | Service is `ok` or `degraded` |
| `503` | Service is `down` |

The healthcheck should help verify:

- Runtime directories
- Ollama availability
- Piper availability

The runtime check verifies the existence of all necessary directories: `runtime/`, `daily_vibes`, `logs`, `audio_cache`, and `tts_jobs`.

---

## 14. API Smoke Tests

Run validation smoke tests:

```bash
npm run smoke:api
```

This checks:

- `/api/health`
- `/api/tifa` validation
- `/api/tifa/stream` validation
- `/api/voice` validation
- `/api/voice/jobs` validation, including missing job and missing audio checks

Run live smoke tests:

```bash
RUN_LIVE_SMOKE=1 npm run smoke:api
```

This additionally checks live local AI/TTS behavior, including the voice job flow and generated WAV download.

Run rate-limit smoke tests:

```bash
RUN_RATE_LIMIT_SMOKE=1 npm run smoke:api
```

Use rate-limit smoke carefully. It assumes low limits or repeated requests and may temporarily trigger expected `429` responses.

---

## 15. Runtime Cleanup

Runtime cleanup is local-first and dry-run by default. It only targets:

- `runtime/audio_cache/`
- `runtime/tts_jobs/`
- `runtime/logs/`

It never removes `runtime/latest.json` or `runtime/daily_vibes/*`.

Run the default dry-run:

```bash
npm run cleanup:runtime
```

Delete files for real:

```bash
TRADEVIBE_CLEANUP_DRY_RUN=0 npm run cleanup:runtime
```

Retention defaults:

```text
TRADEVIBE_AUDIO_CACHE_RETENTION_DAYS=30
TRADEVIBE_TTS_JOB_RETENTION_DAYS=7
TRADEVIBE_LOG_RETENTION_DAYS=30
```

---

## 16. Manual API Checks

### Daily Vibe

```bash
curl -s http://127.0.0.1:3100/api/today | jq
```

### Tifa Non-Streaming

```bash
curl -s -X POST http://127.0.0.1:3100/api/tifa \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello Tifa","mood":"focused"}' | jq
```

### Tifa Streaming

```bash
curl -N -X POST http://127.0.0.1:3100/api/tifa/stream \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello Tifa stream","mood":"focused"}'
```

### Legacy Voice

```bash
curl -s "http://127.0.0.1:3100/api/voice?text=Hello%20trader" | jq
```

### Voice Job

```bash
curl -s -X POST http://127.0.0.1:3100/api/voice/jobs \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello trader","voice":"tifa-default","format":"wav"}' | jq
```

### Voice Job Audio

```bash
JOB_ID="replace_with_real_job_id"

curl -s "http://127.0.0.1:3100/api/voice/jobs/${JOB_ID}/audio" \
  -o /tmp/tifa-voice.wav

file /tmp/tifa-voice.wav
ls -lh /tmp/tifa-voice.wav
```

---

## 17. Logs and Debug Commands

### Next.js / PM2

```bash
pm2 status
pm2 logs tradevibe --lines 100
```

### Systemd Pipeline

```bash
journalctl -u tradevibe-insight.service -n 100 --no-pager
journalctl -u tradevibe-insight.timer -n 100 --no-pager
```

### Runtime Logs

```bash
find runtime/logs -maxdepth 1 -type f -printf '%TY-%Tm-%Td %TH:%TM %p\n' | sort | tail -20
```

### Runtime Artifacts

```bash
find runtime -maxdepth 2 -type f | sort | tail -50
```

### TTS Cache

```bash
find runtime/audio_cache -maxdepth 1 -type f | sort | tail -20
find runtime/tts_jobs -maxdepth 1 -type f | sort | tail -20
```

---

## 17. Firewall and LAN Access

If using Ubuntu UFW and you want LAN access to port `3100`:

```bash
sudo ufw allow 3100/tcp
sudo ufw status
```

For local-only deployment, do not expose the port publicly.

Recommended public exposure pattern:

```text
Cloudflare Tunnel / reverse proxy
→ Next.js app
→ local-only Ollama/Piper
```

Do not expose Ollama or Piper directly to the public internet.

---

## 18. Production Notes

### Single-Node State

Current local state is stored under `runtime/` and is not shared across instances.

### In-Memory Rate Limiting

The current rate limiter is process-local. If you run multiple PM2 workers or containers, each process has its own buckets.

For multi-instance production, replace with:

```text
Redis
Reverse proxy limiter
Cloudflare/platform limiter
Database-backed quota system
```

### Voice Jobs

Voice jobs are cache-first and local async. Cache hits return `ready`; cache misses return `queued` and are processed by the local worker.

Local worker flow:

```text
POST /api/voice/jobs
→ write queued job
→ npm run tts:worker processes queued jobs
→ client polls job status
→ client fetches audio
```

Run one pass:

```bash
npm run tts:worker:once
```

Run as a loop:

```bash
npm run tts:worker
```

### Runtime Cleanup

Add cleanup/retention before long-running production use:

```text
runtime/audio_cache/
runtime/tts_jobs/
runtime/logs/
```

Suggested future cleanup strategy:

- Keep recent TTS cache files for 7–30 days.
- Keep failed job records for debugging for 1–7 days.
- Keep logs based on disk capacity.
- Never commit `runtime/`.

---

## 19. Recommended Deployment Validation Checklist

Run after deployment:

```bash
cd /home/nexus/projects/tradevibe-org

npm run lint
npm run build
npm run smoke:api
git diff --check
```

Run live checks:

```bash
RUN_LIVE_SMOKE=1 npm run smoke:api
```

Check health:

```bash
curl -s http://127.0.0.1:3100/api/health | jq
```

Check PM2:

```bash
pm2 status
pm2 logs tradevibe --lines 50
```

Check runtime:

```bash
find runtime -maxdepth 2 -type d | sort
```

---

## 20. Safe Restart Procedure

For PM2 deployment:

```bash
cd /home/nexus/projects/tradevibe-org

git pull --ff-only
npm ci
npm run build
pm2 restart tradevibe
pm2 logs tradevibe --lines 80
curl -s http://127.0.0.1:3100/api/health | jq
```

For direct start:

```bash
cd /home/nexus/projects/tradevibe-org

git pull --ff-only
npm ci
npm run build
npm run start
```

---

## 21. Rollback Notes

If a docs-only change is bad:

```bash
git checkout -- docs/deployment.md
```

If a deployment code update is bad and already committed locally:

```bash
git log --oneline -n 10
git revert <commit_sha>
```

If a PM2 restart uses a bad build:

```bash
pm2 logs tradevibe --lines 100
git status --short
git log --oneline -n 5
```

Then restore the known-good commit and rebuild.
