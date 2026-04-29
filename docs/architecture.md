# TradeVibe Architecture

TradeVibe is a **local-first AI trader companion**. The current codebase is designed for a self-hosted, single-node workstation/server where the web app, local LLM, TTS engine, and generated runtime artifacts live close to each other.

This document describes the architecture that exists in the current codebase. It intentionally does **not** describe TradeVibe as a multi-tenant SaaS platform yet. SaaS and framework expansion can be planned later, but the current implementation is a local-first foundation.

---

## 1. Architecture Summary

TradeVibe has two main layers:

1. **Daily Insight Pipeline**
   - Python-based pipeline.
   - Generates daily trader mood, vibe text, music playlist data, and WAV voice artifacts.
   - Writes generated artifacts into the git-ignored `runtime/` directory.

2. **Next.js Web App**
   - Serves the dashboard UI.
   - Serves API routes through Next.js App Router Route Handlers.
   - Reads pre-generated runtime artifacts.
   - Hosts ChatTifa, the floating AI assistant.
   - Proxies Tifa chat requests to a local Ollama-compatible endpoint.
   - Generates and serves voice audio through Piper TTS and filesystem cache.

High-level flow:

```text
Python Insight Engine
        ↓
runtime/latest.json + runtime/daily_vibes/*
        ↓
Next.js App Router API
        ↓
Frontend Dashboard + ChatTifa
        ↓
Ollama local LLM + Piper TTS
```

---

## 2. Deployment Profile

TradeVibe currently targets this deployment profile:

| Area | Current Design |
|---|---|
| Deployment model | Local-first / self-hosted |
| Node runtime | Single-node Next.js app |
| AI chat | Local Ollama-compatible HTTP API |
| TTS | Local Piper binary |
| Runtime state | Local filesystem |
| Rate limiting | In-memory process-local buckets |
| Chat history | Frontend component state only |
| User auth | Not implemented yet |
| Multi-tenant support | Not implemented yet |
| Distributed queue | Not implemented yet |

Important implication:

> Runtime artifacts, audio cache, TTS job state, and rate-limit buckets are local to one machine/process. Multi-instance production will require Redis, database-backed state, object storage, or equivalent platform services.

---

## 3. Main Components

### 3.1 Python Insight Engine

Location:

```text
insight_engine/
```

Responsibilities:

- Generate the daily trader mood.
- Generate the motivational daily vibe text.
- Generate playlist artifacts.
- Generate or reference the daily vibe audio file.
- Write runtime artifacts to `runtime/`.
- Write `runtime/latest.json` manifest.

Important runtime helper:

```text
insight_engine/runtime_paths.py
```

This Python helper resolves the runtime directory, creates daily/log directories, calculates the current date in the configured timezone, and writes the latest manifest.

---

### 3.2 Runtime Artifact Store

Location:

```text
runtime/
```

Responsibilities:

- Store generated daily vibe artifacts.
- Store logs.
- Store cached TTS audio.
- Store voice job records.

The runtime directory is intentionally git-ignored because it contains generated local artifacts.

---

### 3.3 Next.js Web App

Main locations:

```text
app/
components/
lib/
```

Responsibilities:

- Render the TradeVibe dashboard.
- Load the latest daily vibe package through `/api/today`.
- Render Spotify and YouTube embeds.
- Decode and play the daily WAV audio.
- Render the ChatTifa floating assistant.
- Provide local API routes for Tifa chat, voice, healthcheck, and runtime reads.

---

### 3.4 ChatTifa

Main file:

```text
components/ChatTifa.tsx
```

Responsibilities:

- Render the floating Tifa assistant widget.
- Sync avatar with the current daily mood.
- Display user and assistant messages.
- Support minimize/expand.
- Show typing state.
- Auto-scroll to the latest message.
- Support voice on/off.
- Play greeting voice once on mount.
- Send user messages through a streaming-first flow.
- Fall back to non-streaming chat when the stream fails before producing a usable response.
- Play Tifa reply voice through the cache-first voice job client.

---

### 3.5 Client API Utilities

Main file:

```text
lib/client-api.ts
```

Responsibilities:

- Parse standardized API errors.
- Convert base64 audio to browser Blob.
- Play legacy base64 audio.
- Send non-streaming Tifa messages.
- Stream Tifa replies through SSE.
- Create voice jobs.
- Poll voice job status.
- Play binary audio from voice job URL.
- Fall back from voice jobs to the legacy voice endpoint.

Important exported client functions:

```text
sendTifaMessage()
streamTifaReply()
createVoiceJob()
getVoiceJob()
playAudioUrl()
playVoiceJobAudio()
playLegacyVoice()
playTifaVoice()
```

---

### 3.6 API Error Layer

Main file:

```text
lib/api.ts
```

Responsibilities:

- Create standardized JSON error responses.
- Generate request IDs.
- Parse timeout values from environment variables.
- Safely delete temporary files.

Standard error envelope:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Client-safe error message.",
    "request_id": "uuid",
    "retryable": false,
    "details": {}
  }
}
```

Supported error codes include:

```text
VALIDATION_ERROR
PAYLOAD_TOO_LARGE
UPSTREAM_AI_ERROR
AI_TIMEOUT
TTS_TIMEOUT
TTS_GENERATION_FAILED
HEALTH_CHECK_FAILED
RATE_LIMITED
INTERNAL_ERROR
```

---

### 3.7 Local Rate Limiter

Main file:

```text
lib/rate-limit.ts
```

Responsibilities:

- Provide simple in-memory request buckets.
- Rate-limit Tifa and voice endpoints by client IP.
- Provide retry-after information.
- Periodically clean expired buckets.

Current limitation:

> This limiter is process-local. It is suitable for local development and single-node deployment. It is not suitable for PM2 cluster mode, multiple containers, or horizontally scaled deployments unless replaced with Redis or an external limiter.

---

## 4. Runtime Directory Layout

TradeVibe creates and uses this runtime layout:

```text
runtime/
├─ latest.json
├─ daily_vibes/
│  ├─ music_<mood>_<date>.json
│  ├─ vibe_<mood>_<date>.json
│  └─ vibe_<mood>_<date>.wav
├─ logs/
├─ audio_cache/
│  ├─ <cache_key>.wav
│  └─ <cache_key>.json
└─ tts_jobs/
   └─ <job_id>.json
```

Directory responsibilities:

| Path | Purpose |
|---|---|
| `runtime/latest.json` | Latest manifest written by the insight pipeline |
| `runtime/daily_vibes/` | Generated daily vibe, music, and WAV artifacts |
| `runtime/logs/` | Pipeline and runtime logs |
| `runtime/audio_cache/` | TTS cache WAV files and metadata |
| `runtime/tts_jobs/` | Filesystem voice job records |

Runtime directories are created by the shared runtime helper in `lib/runtime.ts`.

---

## 5. Daily Vibe Flow

The daily vibe flow is artifact-first. The UI does not generate the daily vibe on page load. Instead, it reads pre-generated artifacts.

```text
Python Insight Engine
→ runtime/latest.json
→ runtime/daily_vibes/music_*.json
→ runtime/daily_vibes/vibe_*.json
→ runtime/daily_vibes/vibe_*.wav
→ GET /api/today
→ app/page.tsx
→ dashboard render
```

### API Route

```text
app/api/today/route.ts
```

Responsibilities:

1. Ensure runtime directories exist.
2. Read `runtime/latest.json` if available.
3. Resolve the referenced music, vibe, and audio artifacts.
4. Fall back to scanning `runtime/daily_vibes/` if the manifest is missing or stale.
5. Encode the WAV audio file as base64.
6. Return a single daily vibe bundle to the frontend.

Response shape:

```json
{
  "date": "YYYY-MM-DD",
  "mood": "focused",
  "vibe": "Stay calm and trade with confidence.",
  "spotify": [],
  "youtube": [],
  "audio": "base64-wav-or-null",
  "created_at": "ISO-8601"
}
```

### Frontend Consumer

```text
app/page.tsx
```

Responsibilities:

- Fetch `/api/today`.
- Set the current mood and vibe.
- Render playlist embeds.
- Convert base64 WAV audio to a browser Blob.
- Attempt autoplay.
- Render `<ChatTifa mood={mood} />`.

Autoplay may be blocked by the browser. This is expected behavior and should be handled gracefully.

---

## 6. Tifa Chat Architecture

Tifa has two chat paths:

1. Preferred streaming path: `/api/tifa/stream`
2. Non-streaming fallback path: `/api/tifa`

Both paths use the same conceptual ingredients:

- User message from ChatTifa.
- Runtime prompt from `prompts/TIFA_RUNTIME.md`.
- Local Ollama-compatible generate endpoint from `TIFA_API_URL`.
- Model name from `TIFA_MODEL`.
- Timeout from `TIFA_TIMEOUT_MS`.
- Local IP-based rate limit.

---

## 7. Tifa Non-Streaming Flow

This is the fallback path.

```text
ChatTifa.tsx
→ sendTifaMessage()
→ POST /api/tifa
→ read Tifa runtime prompt
→ call Ollama /api/generate stream=false
→ return full assistant reply
→ update ChatTifa message list
```

### API Route

```text
app/api/tifa/route.ts
```

Responsibilities:

1. Parse JSON request body.
2. Validate `message`.
3. Reject empty messages.
4. Reject messages longer than `MAX_MESSAGE_LENGTH`.
5. Check local rate limit.
6. Read prompt from `TIFA_PROMPT_PATH`.
7. Build final prompt.
8. Call `TIFA_API_URL` with `stream: false`.
9. Return `{ reply, model }`.
10. Return standardized error envelope on validation, timeout, upstream, or internal failure.

Request shape:

```json
{
  "message": "Hello Tifa",
  "mood": "focused"
}
```

Response shape:

```json
{
  "reply": "Tifa response text",
  "model": "gemma3:1b"
}
```

---

## 8. Tifa SSE Streaming Flow

This is the preferred ChatTifa path.

```text
ChatTifa.tsx
→ streamTifaReply()
→ POST /api/tifa/stream
→ read Tifa runtime prompt
→ call Ollama /api/generate stream=true
→ transform Ollama stream chunks into SSE events
→ frontend receives delta chunks
→ update the last Tifa message progressively
```

### API Route

```text
app/api/tifa/stream/route.ts
```

Responsibilities:

1. Parse JSON request body before opening the stream.
2. Validate `message`.
3. Reject empty or oversized messages.
4. Check local rate limit.
5. Read prompt from `TIFA_PROMPT_PATH`.
6. Call local Ollama with `stream: true`.
7. Transform Ollama JSON lines into SSE events.
8. Emit `start`, `delta`, `done`, and `error` events.
9. Return proper SSE headers.

SSE event types:

```text
event: start
data: {"model":"gemma3:1b"}

event: delta
data: {"text":"partial text"}

event: done
data: {"model":"gemma3:1b"}

event: error
data: {"code":"ERROR_CODE","message":"Client-safe error"}
```

SSE response headers:

```text
Content-Type: text/event-stream; charset=utf-8
Cache-Control: no-cache, no-transform
Connection: keep-alive
X-Accel-Buffering: no
```

### Frontend Handling

`streamTifaReply()` reads the response body through a stream reader, parses SSE chunks, appends `delta` text to the current response, and returns:

```json
{
  "text": "full streamed text",
  "completed": true
}
```

If streaming fails before producing usable text, ChatTifa can fall back to the non-streaming endpoint.

---

## 9. Tifa Frontend Fallback Strategy

ChatTifa uses a streaming-first strategy:

```text
User sends message
→ add user message
→ add empty Tifa message placeholder
→ try streamTifaReply()
   → on delta: update placeholder
   → on done: mark final reply
→ if stream fails:
   → if partial text exists: show partial text and interruption warning
   → else if error is fallback-safe: call sendTifaMessage()
   → else show error and remove empty placeholder
```

Fallback should not happen for user-side errors like validation or rate limit. It is mainly intended for network errors or server/upstream failures.

---

## 10. Voice Architecture

TradeVibe currently has two voice paths:

1. **Preferred:** cache-first voice jobs.
2. **Fallback:** legacy base64 voice endpoint.

The frontend should use `playTifaVoice()` rather than calling either endpoint directly.

```text
playTifaVoice()
→ try playVoiceJobAudio()
→ if voice job fails, call playLegacyVoice()
```

---

## 11. Legacy Voice Flow

The legacy voice endpoint is still available for compatibility and fallback.

```text
ChatTifa or client-api fallback
→ GET /api/voice?text=...
→ spawn Piper process
→ write temporary WAV to /tmp
→ read WAV as Buffer
→ return base64 JSON
→ frontend converts base64 to Blob
→ browser Audio playback
```

### API Route

```text
app/api/voice/route.ts
```

Responsibilities:

1. Read `text` query parameter.
2. Validate non-empty text.
3. Reject text longer than `MAX_TEXT_LENGTH`.
4. Check local rate limit.
5. Spawn Piper binary from `PIPER_BIN`.
6. Use Piper model from `PIPER_MODEL`.
7. Write output WAV to `/tmp`.
8. Read WAV file.
9. Delete temporary file.
10. Return base64 WAV in JSON.

Response shape:

```json
{
  "voice": "Tifa (LibriTTS High)",
  "model": "configured-model.onnx",
  "audio": "base64-wav"
}
```

---

## 12. Voice Job + Cache Flow

The voice job API is the preferred path for ChatTifa voice playback.

```text
ChatTifa.tsx
→ playTifaVoice()
→ playVoiceJobAudio()
→ POST /api/voice/jobs
→ create cache key
→ check runtime/audio_cache/<cache_key>.json
→ cache hit?
   yes:
     → write ready job record
     → return job_id + audio_url
   no:
     → generate audio with Piper
     → write runtime/audio_cache/<cache_key>.wav
     → write runtime/audio_cache/<cache_key>.json
     → write runtime/tts_jobs/<job_id>.json
     → return job_id + audio_url
→ GET /api/voice/jobs/{jobId}/audio
→ browser Audio(audioUrl).play()
```

### API Routes

```text
app/api/voice/jobs/route.ts
app/api/voice/jobs/[jobId]/route.ts
app/api/voice/jobs/[jobId]/audio/route.ts
```

### Cache Helper

```text
lib/tts-cache.ts
```

Responsibilities:

- Normalize TTS text.
- Resolve voice identity.
- Resolve Piper binary and model path.
- Create deterministic cache key.
- Read/write audio cache metadata.
- Read/write voice job records.
- Generate audio to cache on cache miss.
- Return completed job metadata.
- Mark failed jobs when generation fails.

Cache key input:

```text
normalized_text | voice | model_path | format
```

Cache key algorithm:

```text
sha256(normalized_text|voice|model_path|format)
```

Current limitation:

> The API is job-shaped and cache-first, but cache misses are still generated synchronously in the request handler. A true background worker queue is planned for a later implementation slice.

---

## 13. Voice Job State Model

Voice job records are JSON files stored in:

```text
runtime/tts_jobs/<job_id>.json
```

Record shape:

```json
{
  "job_id": "tts_uuid",
  "status": "queued | processing | ready | failed",
  "cache_key": "sha256-cache-key",
  "audio_url": "/api/voice/jobs/tts_uuid/audio",
  "error": null,
  "voice": "tifa-default",
  "model": "en_US-libritts-high.onnx",
  "created_at": "ISO-8601",
  "updated_at": "ISO-8601"
}
```

Audio cache files are stored in:

```text
runtime/audio_cache/<cache_key>.wav
runtime/audio_cache/<cache_key>.json
```

---

## 14. Environment Configuration

Important environment variables:

```env
TRADEVIBE_TIMEZONE=Asia/Ho_Chi_Minh
TRADEVIBE_RUNTIME_DIR=runtime
HOST=0.0.0.0
PORT=3100

OLLAMA_URL=http://127.0.0.1:11434
TIFA_API_URL=http://127.0.0.1:11434/api/generate
TIFA_MODEL=gemma3:1b
TIFA_TIMEOUT_MS=20000
TIFA_PROMPT_PATH=prompts/TIFA_RUNTIME.md

PIPER_BIN=/home/nexus/piper-env/bin/piper
PIPER_MODEL=/home/nexus/piper/voices/en_US-libritts-high.onnx
PIPER_TIMEOUT_MS=10000

TIFA_RATE_LIMIT_WINDOW_MS=60000
TIFA_RATE_LIMIT_MAX=20
VOICE_RATE_LIMIT_WINDOW_MS=60000
VOICE_RATE_LIMIT_MAX=10
```

---

## 15. API Surface Map

| Method | Endpoint | Role |
|---|---|---|
| `GET` | `/api/today` | Load latest daily vibe bundle |
| `POST` | `/api/tifa` | Non-streaming Tifa fallback |
| `POST` | `/api/tifa/stream` | Preferred Tifa SSE streaming |
| `GET` | `/api/voice?text=...` | Legacy base64 Piper voice |
| `POST` | `/api/voice/jobs` | Create cache-first voice job |
| `GET` | `/api/voice/jobs/{jobId}` | Read voice job status |
| `GET` | `/api/voice/jobs/{jobId}/audio` | Fetch binary WAV audio |
| `GET` | `/api/health` | Healthcheck runtime/Ollama/Piper |

---

## 16. Frontend Component Map

| File | Responsibility |
|---|---|
| `app/page.tsx` | Main dashboard page |
| `components/ChatTifa.tsx` | Floating ChatTifa assistant |
| `lib/client-api.ts` | Browser-side API and audio helpers |

Main page responsibilities:

- Fetch `/api/today`.
- Render mood and vibe.
- Render Spotify/YouTube embeds.
- Play daily audio if available.
- Mount ChatTifa with the current mood.

ChatTifa responsibilities:

- Manage chat messages.
- Send streaming chat requests.
- Fall back to non-streaming chat.
- Play voice greeting/replies.
- Render mood-based UI.

---

## 17. Backend File Map

| File | Responsibility |
|---|---|
| `app/api/today/route.ts` | Load daily runtime artifacts |
| `app/api/tifa/route.ts` | Non-streaming Tifa endpoint |
| `app/api/tifa/stream/route.ts` | SSE streaming Tifa endpoint |
| `app/api/voice/route.ts` | Legacy base64 Piper voice endpoint |
| `app/api/voice/jobs/route.ts` | Create cache-first voice job |
| `app/api/voice/jobs/[jobId]/route.ts` | Read voice job status |
| `app/api/voice/jobs/[jobId]/audio/route.ts` | Serve binary WAV voice job audio |
| `lib/runtime.ts` | Runtime directory and artifact helpers |
| `lib/tts-cache.ts` | TTS cache and voice job helpers |
| `lib/api.ts` | Standardized error responses and utilities |
| `lib/rate-limit.ts` | Local in-memory rate limiting |

---

## 18. Healthcheck and Smoke Tests

### Healthcheck

Endpoint:

```text
GET /api/health
```

Purpose:

- Check runtime directories.
- Check local Ollama dependency.
- Check Piper dependency.
- Return `ok`, `degraded`, or `down`.

### Smoke Test

Script:

```text
scripts/smoke-api.sh
```

NPM command:

```bash
npm run smoke:api
```

Smoke test coverage includes:

- Health endpoint shape.
- `/api/tifa` validation.
- `/api/tifa/stream` validation.
- `/api/voice` validation.
- Optional live API checks with `RUN_LIVE_SMOKE=1`.
- Optional rate-limit checks with `RUN_RATE_LIMIT_SMOKE=1`.

---

## 19. Current Limitations

### 19.1 Single-Node Filesystem State

Current local state is stored in the filesystem:

```text
runtime/latest.json
runtime/daily_vibes/
runtime/audio_cache/
runtime/tts_jobs/
```

This is simple and practical for a local workstation/server, but not enough for distributed multi-instance deployment.

### 19.2 In-Memory Rate Limiting

Current rate limiting is in-memory and process-local. It does not synchronize across PM2 cluster workers, containers, or multiple servers.

Future replacement:

```text
Redis
Reverse proxy limiter
Cloudflare/platform limiter
Database-backed quota layer
```

### 19.3 Voice Jobs Are Not Fully Async Yet

The voice job API has a job-shaped contract, but cache misses still generate audio synchronously inside the request.

Future replacement:

```text
POST /api/voice/jobs
→ write queued job
→ background worker generates audio
→ client polls job status
```

### 19.4 No User Authentication Yet

There is no user account layer, so ChatTifa history is currently browser/component state rather than persisted per user.

### 19.5 No SaaS Tenant Model Yet

The current app does not include:

- Tenant registry.
- Tenant isolation.
- Billing hooks.
- Tenant-specific assistants.
- Tenant-scoped storage.
- Cross-tenant security policy.

---

## 20. Future Architecture Direction

The current codebase can evolve in stages:

### Phase 1: Harden Local-First Foundation

- Keep filesystem runtime artifacts.
- Keep local Ollama.
- Keep Piper TTS.
- Add cleanup for `runtime/audio_cache`.
- Add cleanup for `runtime/tts_jobs`.
- Add smoke tests for voice jobs.
- Refactor duplicated Tifa route logic into shared service helpers.

### Phase 2: Add Real Async Voice Queue

- Add queue-backed voice jobs.
- Move cache-miss TTS generation out of the request path.
- Add worker process.
- Add retry and failure policy.
- Add cache retention policy.

### Phase 3: Add Persistent History and Auth

- Add user authentication.
- Add chat sessions.
- Persist assistant messages.
- Persist voice metadata.
- Add user preferences.

### Phase 4: Prepare Tifa Assistant Framework

- Extract `ChatTifa` into a reusable component package.
- Extract provider orchestration.
- Add provider abstraction for Ollama/OpenAI/Gemini.
- Add TTS provider abstraction.
- Add tenant-aware configuration.
- Add production observability and usage metering.

---

## 21. Recommended Engineering Principles

For the current repository:

1. Keep the frontend simple and resilient.
2. Prefer SSE for text streaming.
3. Keep WebSocket for future duplex use cases only.
4. Keep `/api/tifa` as a fallback until streaming is fully hardened.
5. Keep `/api/voice?text=...` as a fallback until voice jobs are fully async.
6. Do not put generated audio blobs into source control.
7. Do not commit `.env`.
8. Do not expose local Ollama or Piper directly to the public internet.
9. Do not treat in-memory rate limiting as distributed production protection.
10. Keep docs aligned with actual code paths.

---

## 22. Validation Commands

After architecture-related changes, run:

```bash
npm run lint
npm run build
npm run smoke:api
git diff --check
```

For live endpoint checks:

```bash
RUN_LIVE_SMOKE=1 npm run smoke:api
```
