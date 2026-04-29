# Gemini CLI DevOps Guide — TradeVibe

This guide defines how Gemini CLI should be used inside the `tradevibe-org` repository.

Gemini CLI is a **development and DevOps assistant only**. It must help inspect, plan, patch, validate, and document the repo. It must not act as the runtime Tifa assistant and must not generate fake runtime artifacts.

Current repo identity:

```text
Repo: tradevibe-org
Role: Local-first AI trader companion
Frontend: Next.js 15.5.5 + React 19.1.0
Runtime: filesystem artifacts under runtime/
Chat: ChatTifa with SSE streaming and non-streaming fallback
Voice: Piper TTS with cache-first voice jobs and legacy fallback
AI backend: local Ollama-compatible endpoint
Deployment: single-node self-hosted foundation
```

---

## 1. Entrypoint

Run Gemini CLI from the repo root:

```bash
cd /home/nexus/projects/tradevibe-org

./bin/tvgcli.sh "inspect repo and summarize current architecture"
```

Optional alias:

```bash
mkdir -p ~/.local/bin
ln -sf /home/nexus/projects/tradevibe-org/bin/tvgcli.sh ~/.local/bin/tvgcli
```

Then use:

```bash
tvgcli "inspect package.json, Next.js API routes, ChatTifa, runtime helpers, and docs"
```

---

## 2. Operating Boundary

Gemini CLI is used for:

- Code inspection
- Repo mapping
- DevOps planning
- Small safe patches
- Documentation updates
- Validation command planning
- Error analysis
- Git diff review
- Smoke-test planning

Gemini CLI must not:

- Act as Tifa
- Impersonate ChatTifa runtime persona
- Generate fake runtime logs
- Generate fake playlist output
- Generate fake daily vibe artifacts
- Generate fake voice job records
- Modify generated files under `runtime/` unless explicitly requested
- Read, print, copy, or expose secrets from `.env`
- Commit secrets
- Replace local runtime data with guessed data
- Claim tests passed unless validation commands were actually run

---

## 3. Current Architecture Facts Gemini Must Preserve

When modifying docs or code, Gemini must preserve these facts:

### 3.1 Local-first deployment

TradeVibe is currently a local-first, single-node, self-hosted app. It is not yet a distributed SaaS platform.

### 3.2 Runtime filesystem state

Runtime artifacts live under:

```text
runtime/
├─ latest.json
├─ daily_vibes/
├─ logs/
├─ audio_cache/
└─ tts_jobs/
```

### 3.3 Daily vibe flow

```text
Python Insight Engine
→ runtime/latest.json
→ runtime/daily_vibes/*
→ GET /api/today
→ app/page.tsx
```

### 3.4 ChatTifa flow

```text
ChatTifa.tsx
→ streamTifaReply()
→ POST /api/tifa/stream
→ fallback to POST /api/tifa when appropriate
```

### 3.5 Voice flow

```text
ChatTifa.tsx
→ playTifaVoice()
→ try /api/voice/jobs
→ fetch /api/voice/jobs/{jobId}/audio
→ fallback to /api/voice?text=...
```

### 3.6 Current voice job limitation

The voice job API is cache-first and job-shaped, but cache misses still generate audio synchronously inside the request.

### 3.7 Current rate-limit limitation

The rate limiter is in-memory and process-local. It is suitable for single-node/local development, not distributed production.

---

## 4. Files Gemini Should Inspect Before Patching

Before changing docs or architecture-sensitive code, inspect these files:

```text
package.json
.env.example
README.md
CHANGELOG.md
docs/architecture.md
docs/api-reference.md
docs/deployment.md
docs/troubleshooting.md
docs/GEMINI_DEVOPS.md
```

For frontend behavior:

```text
app/page.tsx
components/ChatTifa.tsx
lib/client-api.ts
```

For API behavior:

```text
app/api/today/route.ts
app/api/tifa/route.ts
app/api/tifa/stream/route.ts
app/api/voice/route.ts
app/api/voice/jobs/route.ts
app/api/voice/jobs/[jobId]/route.ts
app/api/voice/jobs/[jobId]/audio/route.ts
app/api/health/route.ts
```

For shared runtime logic:

```text
lib/runtime.ts
lib/tts-cache.ts
lib/api.ts
lib/rate-limit.ts
```

For scripts and ops:

```text
scripts/prepare-runtime.sh
scripts/smoke-api.sh
start.sh
ops/
insight_engine/
```

---

## 5. Standard Workflow

Use this workflow for every task:

```text
1. Inspect
2. Summarize current state
3. Identify mismatch or target change
4. Plan patch
5. Apply minimal patch
6. Validate
7. Review diff
8. Summarize result
```

### 5.1 Inspect

Commands:

```bash
git status --short
git branch --show-current
find . -maxdepth 2 -type f | sort | sed 's#^\./##' | head -200
```

### 5.2 Summarize

Gemini should summarize:

- What the repo currently does
- Which files are relevant
- Which behavior must not be broken
- What patch will change

### 5.3 Patch

Patch rules:

- Prefer small, reviewable patches.
- Do not modify unrelated files.
- Do not reformat the entire repo.
- Do not edit generated runtime artifacts.
- Do not change `.env`.
- Do not invent missing runtime data.
- Keep docs aligned with code, not future plans.

### 5.4 Validate

Use validation commands appropriate to the change.

For docs-only changes:

```bash
git diff --check
```

For frontend/API changes:

```bash
npm run lint
npm run build
npm run smoke:api
git diff --check
```

For live local AI checks:

```bash
RUN_LIVE_SMOKE=1 npm run smoke:api
```

For Python pipeline syntax checks:

```bash
bash -n insight_engine/tradevibe_runner.sh
python3 -m py_compile insight_engine/insight_engine_v3.py insight_engine/music_recommender_v3.py
```

---

## 6. Documentation Update Rules

When updating documentation, Gemini must verify docs against the real codebase.

### Required source of truth

Use these files as source of truth:

```text
package.json
.env.example
app/page.tsx
components/ChatTifa.tsx
lib/client-api.ts
lib/runtime.ts
lib/tts-cache.ts
lib/api.ts
lib/rate-limit.ts
scripts/smoke-api.sh
```

### Required docs consistency

Docs must accurately state:

- Next.js app runs on port `3100`.
- `npm run dev` runs `scripts/prepare-runtime.sh` and `next dev -H 0.0.0.0 -p 3100`.
- `runtime/` contains `daily_vibes`, `logs`, `audio_cache`, and `tts_jobs`.
- `/api/today` reads runtime artifacts.
- `/api/tifa/stream` is the preferred ChatTifa path.
- `/api/tifa` is the non-streaming fallback path.
- `/api/voice/jobs` is the preferred ChatTifa voice path.
- `/api/voice?text=...` is the legacy fallback voice path.
- Voice jobs are not fully async yet.
- Rate limiting is in-memory and process-local.
- The app is local-first/single-node, not distributed SaaS.

### Stale wording to remove

Do not write or keep:

```text
The frontend has not yet been switched to /api/tifa/stream.
The frontend has not yet been switched to voice jobs.
TradeVibe is fully production-ready multi-tenant SaaS.
Voice jobs are fully asynchronous workers.
Rate limiting is distributed production-grade.
```

---

## 7. Safe Patch Templates

### 7.1 Docs-only patch template

```bash
cd /home/nexus/projects/tradevibe-org

git status --short

cp docs/example.md "docs/example.md.bak.$(date +%Y%m%d_%H%M%S)"

cat > docs/example.md <<'DOC'
# New content
DOC

git diff -- docs/example.md
git diff --check -- docs/example.md
git status --short
```

### 7.2 Code patch template

```bash
cd /home/nexus/projects/tradevibe-org

git status --short

# Apply minimal patch here.

npm run lint
npm run build
npm run smoke:api
git diff --check
git status --short
```

### 7.3 Long Python patch template

```bash
cd /home/nexus/projects/tradevibe-org

.venv/bin/python - <<'PY'
from pathlib import Path

path = Path("target_file")
text = path.read_text(encoding="utf-8")

old = """old text"""
new = """new text"""

if old not in text:
    raise SystemExit("ERROR: old block not found")

path.write_text(text.replace(old, new), encoding="utf-8")
PY

git diff -- target_file
git diff --check -- target_file
```

---

## 8. Validation Commands

### 8.1 Core validation

```bash
npm run lint
npm run build
npm run smoke:api
git diff --check
```

### 8.2 Full local live validation

```bash
RUN_LIVE_SMOKE=1 npm run smoke:api
```

### 8.3 API manual checks

```bash
curl -s http://127.0.0.1:3100/api/health | jq

curl -s http://127.0.0.1:3100/api/today | jq

curl -s -X POST http://127.0.0.1:3100/api/tifa \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello Tifa","mood":"focused"}' | jq

curl -N -X POST http://127.0.0.1:3100/api/tifa/stream \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello Tifa stream","mood":"focused"}'
```

### 8.4 Voice manual checks

```bash
curl -s "http://127.0.0.1:3100/api/voice?text=Hello%20trader" | jq '.audio != null'

curl -s -X POST http://127.0.0.1:3100/api/voice/jobs \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello trader","voice":"tifa-default","format":"wav"}' | jq
```

### 8.5 Runtime checks

```bash
find runtime -maxdepth 2 -type d | sort
find runtime/audio_cache -maxdepth 1 -type f | sort | tail -20
find runtime/tts_jobs -maxdepth 1 -type f | sort | tail -20
```

### 8.6 Python pipeline checks

```bash
bash -n insight_engine/tradevibe_runner.sh
python3 -m py_compile insight_engine/insight_engine_v3.py insight_engine/music_recommender_v3.py
```

---

## 9. Git Rules

Gemini may suggest Git commands, but should keep them safe.

Allowed for small verified changes:

```bash
git status --short
git diff
git diff --check
git add <specific-files>
git commit -m "message"
```

Avoid:

```bash
git add .
git reset --hard
git clean -fd
git push --force
```

unless the user explicitly requests and understands the consequence.

Recommended docs commit:

```bash
git add README.md CHANGELOG.md docs
git commit -m "docs: align README and docs with current TradeVibe codebase"
```

---

## 10. Secrets and Runtime Data Policy

Gemini must never print or expose secrets.

Sensitive files:

```text
.env
.env.local
.env.production
```

Generated runtime data:

```text
runtime/
```

Rules:

- Do not commit `.env`.
- Do not commit `runtime/`.
- Do not copy secrets into docs.
- Do not fake runtime output.
- Do not generate fake `latest.json`.
- Do not generate fake TTS job records.
- Do not generate fake playlist or vibe artifacts.
- Use `.env.example` for documentation.

---

## 11. Runtime vs Dev Persona Boundary

TradeVibe has two separate AI roles:

### Runtime assistant

```text
Tifa / ChatTifa
```

Role:

- User-facing companion.
- Responds through app UI.
- Uses runtime prompt.
- Uses local Ollama endpoint.
- May play voice through TTS.

### DevOps assistant

```text
Gemini CLI
```

Role:

- Repo inspection.
- Code patching.
- Docs patching.
- Build/test validation.
- Ops guidance.

Gemini CLI must not become Tifa. It should not write runtime assistant dialogue unless explicitly modifying prompt files or UI copy by user request.

---

## 12. Common Task Prompts

### Inspect repo

```bash
./bin/tvgcli.sh "Inspect this repo. Summarize current architecture, main files, package scripts, API routes, runtime directories, and validation commands. Do not modify files."
```

### Inspect API routes

```bash
./bin/tvgcli.sh "Inspect app/api routes and lib helpers. Map each endpoint to request shape, response shape, env vars, and failure modes. Do not modify files."
```

### Update docs safely

```bash
./bin/tvgcli.sh "Update documentation only. Align README.md and docs with the current codebase. Do not modify runtime code or generated files. Validate with git diff --check."
```

### Review voice job implementation

```bash
./bin/tvgcli.sh "Inspect the voice job implementation in app/api/voice/jobs and lib/tts-cache.ts. Identify current behavior, limitations, and safe next hardening tasks. Do not modify files."
```

### Review ChatTifa streaming

```bash
./bin/tvgcli.sh "Inspect ChatTifa streaming flow from components/ChatTifa.tsx through lib/client-api.ts and app/api/tifa/stream/route.ts. Summarize fallback behavior and failure modes. Do not modify files."
```

---

## 13. Recommended Next Hardening Tasks

After docs are aligned, the next engineering tasks should be:

1. Add smoke tests for:
   - `POST /api/voice/jobs`
   - `GET /api/voice/jobs/{jobId}`
   - `GET /api/voice/jobs/{jobId}/audio`

2. Refactor duplicated Tifa route logic into shared helpers:
   - prompt loading
   - request validation
   - Ollama call setup
   - timeout handling
   - rate-limit config

3. Add runtime cleanup scripts for:
   - `runtime/audio_cache`
   - `runtime/tts_jobs`
   - `runtime/logs`

4. Convert voice jobs to real async worker flow:
   - create queued job
   - background worker generates audio
   - client polls status
   - audio endpoint serves ready file

5. Replace in-memory rate limiter for production:
   - Redis
   - reverse proxy limiter
   - platform-level limiter

---

## 14. Closeout Checklist

Before closing any Gemini-assisted task, verify:

```bash
git status --short
git diff --check
```

If code changed:

```bash
npm run lint
npm run build
npm run smoke:api
```

If local AI/TTS behavior changed:

```bash
RUN_LIVE_SMOKE=1 npm run smoke:api
```

If docs changed:

```bash
grep -n "frontend has not yet been switched" docs/*.md || true
grep -n "fully production-ready multi-tenant" README.md docs/*.md || true
```

The final report should include:

- Files changed
- What changed
- Commands run
- Validation result
- Known remaining limitations
- Suggested next step
