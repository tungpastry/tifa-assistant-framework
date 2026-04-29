# TradeVibe API Reference

This document describes the API surface implemented by the current TradeVibe codebase.

TradeVibe currently uses **Next.js App Router Route Handlers** as its API layer. The API is designed for a **local-first, single-node, self-hosted deployment**. It reads runtime artifacts from the local filesystem, proxies Tifa chat requests to a local Ollama-compatible endpoint, and generates TTS audio through a local Piper binary.

---

## 1. API Overview

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/today` | Load the latest daily vibe bundle |
| `POST` | `/api/tifa` | Non-streaming Tifa chat fallback |
| `POST` | `/api/tifa/stream` | Preferred SSE streaming Tifa chat |
| `GET` | `/api/voice?text=...` | Legacy Piper voice endpoint returning base64 WAV |
| `POST` | `/api/voice/jobs` | Create a cache-first voice job |
| `GET` | `/api/voice/jobs/{jobId}` | Read voice job status |
| `GET` | `/api/voice/jobs/{jobId}/audio` | Fetch generated binary WAV audio |
| `GET` | `/api/health` | Check runtime, Ollama, and Piper health |

---

## 2. Standard API Error Envelope

Most API endpoints use a standardized JSON error envelope.

### Shape

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

### Fields

| Field | Type | Description |
|---|---|---|
| `error.code` | string | Stable machine-readable error code |
| `error.message` | string | Client-safe message |
| `error.request_id` | string | Request ID generated for server-side debugging |
| `error.retryable` | boolean | Whether the client may retry later |
| `error.details` | object | Optional client-safe details only |

### Supported Error Codes

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

Important note:

- Server-only details should stay in logs.
- Client responses should expose only safe details.
- Rate-limit errors may include `details.retry_after_seconds`.

---

## 3. Rate Limiting

TradeVibe currently uses a simple in-memory rate limiter.

### Current Behavior

- Tifa endpoints are rate-limited by client IP.
- Voice endpoints are rate-limited by client IP.
- Limits are configured through environment variables.

### Environment Variables

```env
TIFA_RATE_LIMIT_WINDOW_MS=60000
TIFA_RATE_LIMIT_MAX=20

VOICE_RATE_LIMIT_WINDOW_MS=60000
VOICE_RATE_LIMIT_MAX=10
```

### Limitation

The current limiter is process-local. It is suitable for local development and single-node deployment. It is **not** suitable for PM2 cluster mode, multiple containers, or horizontally scaled production deployments.

For multi-instance production, replace it with:

```text
Redis
Reverse proxy rate limiting
Cloudflare/platform rate limiting
Database-backed quota layer
```

---

# 4. `GET /api/today`

Loads the latest daily vibe bundle.

## Purpose

This endpoint is used by `app/page.tsx` to render:

- Daily mood
- Daily vibe / motivational quote
- Spotify playlist data
- YouTube playlist data
- Daily WAV voice clip as base64 audio

## Implementation

```text
app/api/today/route.ts
```

## Runtime Data Sources

The endpoint uses the local runtime artifact store:

```text
runtime/latest.json
runtime/daily_vibes/music_*.json
runtime/daily_vibes/vibe_*.json
runtime/daily_vibes/vibe_*.wav
```

## Logic

1. Ensure runtime directories exist.
2. Read `runtime/latest.json` if available.
3. Resolve `musicPath`, `vibePath`, and `audioPath` from the manifest.
4. If the manifest or referenced files are unavailable, fall back to scanning `runtime/daily_vibes/`.
5. Load the newest matching `music_*.json`.
6. Resolve sibling `vibe_*.json` and `vibe_*.wav`.
7. Encode the WAV file as base64 if it exists.
8. Return a dashboard-ready JSON bundle.

## Success Response

Status:

```text
200 OK
```

Shape:

```json
{
  "date": "YYYY-MM-DD",
  "mood": "focused",
  "vibe": "Stay calm and trade with confidence 💫",
  "spotify": [
    {
      "title": "Playlist title",
      "url": "https://open.spotify.com/playlist/..."
    }
  ],
  "youtube": [
    {
      "title": "Video title",
      "url": "https://www.youtube.com/watch?v=..."
    }
  ],
  "audio": "base64-wav-audio-or-null",
  "created_at": "ISO-8601"
}
```

## Error Response

Status:

```text
500 Internal Server Error
```

Shape:

```json
{
  "error": "Failed to load daily vibe & playlist"
}
```

Note: this endpoint currently returns a simpler error shape than the standardized `jsonError()` envelope.

---

# 5. `POST /api/tifa`

Non-streaming Tifa chat endpoint.

## Purpose

This endpoint is the fallback path for ChatTifa when the preferred SSE streaming endpoint fails before producing a usable response.

## Implementation

```text
app/api/tifa/route.ts
```

## Request Body

```json
{
  "message": "Hello Tifa",
  "mood": "focused"
}
```

### Fields

| Field | Required | Description |
|---|---:|---|
| `message` | yes | User message sent to Tifa |
| `mood` | no | Current mood from the dashboard; accepted by the client path but not deeply required by the route |

## Validation

| Rule | Result |
|---|---|
| Invalid JSON | `400 VALIDATION_ERROR` |
| Empty `message` | `400 VALIDATION_ERROR` |
| Message longer than 2000 characters | `413 PAYLOAD_TOO_LARGE` |
| Too many requests | `429 RATE_LIMITED` |

## Environment Variables

```env
TIFA_API_URL=http://127.0.0.1:11434/api/generate
TIFA_MODEL=gemma3:1b
TIFA_TIMEOUT_MS=20000
TIFA_PROMPT_PATH=prompts/TIFA_RUNTIME.md
```

## Flow

```text
POST /api/tifa
→ validate request
→ check rate limit
→ read TIFA_PROMPT_PATH
→ append user message
→ call TIFA_API_URL with stream=false
→ return full reply
```

## Upstream Ollama Payload

```json
{
  "model": "gemma3:1b",
  "prompt": "Tifa runtime prompt\nUser message: Hello Tifa",
  "stream": false
}
```

## Success Response

Status:

```text
200 OK
```

Shape:

```json
{
  "reply": "Tifa response text",
  "model": "gemma3:1b"
}
```

## Error Responses

| Status | Code | Meaning |
|---:|---|---|
| 400 | `VALIDATION_ERROR` | Invalid JSON or empty message |
| 413 | `PAYLOAD_TOO_LARGE` | Message exceeds max length |
| 429 | `RATE_LIMITED` | Too many requests |
| 502 | `UPSTREAM_AI_ERROR` | Local AI service failed |
| 504 | `AI_TIMEOUT` | Local AI service timed out |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

Example:

```json
{
  "error": {
    "code": "AI_TIMEOUT",
    "message": "The AI service took too long to respond.",
    "request_id": "uuid",
    "retryable": true
  }
}
```

---

# 6. `POST /api/tifa/stream`

Preferred Tifa streaming endpoint using Server-Sent Events.

## Purpose

This is now the preferred frontend path for ChatTifa. `ChatTifa.tsx` calls `streamTifaReply()` first and falls back to `/api/tifa` only when streaming fails before producing a usable answer.

## Implementation

```text
app/api/tifa/stream/route.ts
```

## Request Body

```json
{
  "message": "Hello Tifa",
  "mood": "focused"
}
```

### Fields

| Field | Required | Description |
|---|---:|---|
| `message` | yes | User message sent to Tifa |
| `mood` | no | Current mood from the frontend client path |

## Validation Before Stream Starts

Before the SSE stream is opened, the route can return normal JSON errors.

| Rule | Result |
|---|---|
| Invalid JSON | `400 VALIDATION_ERROR` |
| Empty `message` | `400 VALIDATION_ERROR` |
| Message longer than 2000 characters | `413 PAYLOAD_TOO_LARGE` |
| Too many requests | `429 RATE_LIMITED` |
| Ollama unavailable before stream starts | `502 UPSTREAM_AI_ERROR` |
| Timeout before stream starts | `504 AI_TIMEOUT` |

## Flow

```text
POST /api/tifa/stream
→ validate request before streaming
→ check rate limit
→ read TIFA_PROMPT_PATH
→ append user message
→ call TIFA_API_URL with stream=true
→ parse Ollama JSON lines
→ emit SSE events to browser
```

## Upstream Ollama Payload

```json
{
  "model": "gemma3:1b",
  "prompt": "Tifa runtime prompt\nUser message: Hello Tifa",
  "stream": true
}
```

## Response Headers

```text
Content-Type: text/event-stream; charset=utf-8
Cache-Control: no-cache, no-transform
Connection: keep-alive
X-Accel-Buffering: no
```

## SSE Events

### `start`

Sent once at the beginning of a successful stream.

```text
event: start
data: {"model":"gemma3:1b"}
```

### `delta`

Sent for each piece of assistant text.

```text
event: delta
data: {"text":"partial text"}
```

### `done`

Sent at the end of a successful stream.

```text
event: done
data: {"model":"gemma3:1b"}
```

### `error`

Sent if an error occurs after the stream has already started.

```text
event: error
data: {"code":"INTERNAL_ERROR","message":"Error reading upstream response."}
```

## Frontend Behavior

The frontend helper `streamTifaReply()`:

1. Opens a POST request to `/api/tifa/stream`.
2. Reads the response body with a stream reader.
3. Parses SSE chunks.
4. Calls `onDelta(text)` for each `delta`.
5. Returns `{ text, completed }` when `done` is received.

ChatTifa behavior:

```text
stream success
→ progressively update the latest Tifa message

stream interrupted after partial text
→ show partial response
→ show interruption warning

stream fails before usable text
→ if fallback-safe, call /api/tifa
```

---

# 7. `GET /api/voice?text=...`

Legacy Piper voice endpoint.

## Purpose

This endpoint generates voice audio directly from a query-string text input and returns base64 WAV audio in JSON.

It remains available as a fallback path for `playTifaVoice()` when the newer voice job path fails.

## Implementation

```text
app/api/voice/route.ts
```

## Query Parameters

| Parameter | Required | Description |
|---|---:|---|
| `text` | yes | Text to synthesize into speech |

Example:

```text
GET /api/voice?text=Hello%20trader
```

## Validation

| Rule | Result |
|---|---|
| Empty `text` | `400 VALIDATION_ERROR` |
| Text longer than 500 characters | `413 PAYLOAD_TOO_LARGE` |
| Too many requests | `429 RATE_LIMITED` |

## Environment Variables

```env
PIPER_BIN=/home/nexus/piper-env/bin/piper
PIPER_MODEL=/home/nexus/piper/voices/en_US-libritts-high.onnx
PIPER_TIMEOUT_MS=10000
```

## Flow

```text
GET /api/voice?text=...
→ validate text
→ check rate limit
→ spawn Piper binary
→ write temporary WAV to /tmp
→ read WAV buffer
→ delete temporary WAV
→ return base64 JSON
```

## Success Response

Status:

```text
200 OK
```

Shape:

```json
{
  "voice": "Tifa (LibriTTS High)",
  "model": "en_US-libritts-high.onnx",
  "audio": "base64-wav-audio"
}
```

## Error Responses

| Status | Code | Meaning |
|---:|---|---|
| 400 | `VALIDATION_ERROR` | Text is empty |
| 413 | `PAYLOAD_TOO_LARGE` | Text exceeds max length |
| 429 | `RATE_LIMITED` | Too many voice requests |
| 504 | `TTS_TIMEOUT` | Piper took too long |
| 500 | `TTS_GENERATION_FAILED` | Piper failed |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

---

# 8. `POST /api/voice/jobs`

Creates a cache-first voice generation job.

## Purpose

This is now the preferred frontend path for ChatTifa voice playback. The client calls `playTifaVoice()`, which tries voice jobs first and falls back to `/api/voice?text=...` if job playback fails.

## Implementation

```text
app/api/voice/jobs/route.ts
lib/tts-cache.ts
```

## Important Current Behavior

The API is currently **cache-first and job-shaped**, but cache misses are still generated synchronously inside the request.

That means:

- Cache hit: fast response.
- Cache miss: the request waits while Piper generates audio.
- A true background worker queue is planned for a later implementation slice.

## Request Body

```json
{
  "text": "Hello trader",
  "voice": "tifa-default",
  "format": "wav"
}
```

### Fields

| Field | Required | Default | Description |
|---|---:|---|---|
| `text` | yes | none | Text to synthesize |
| `voice` | no | `tifa-default` | Voice identity |
| `format` | no | `wav` | Audio format |
| `modelPath` | no | `PIPER_MODEL` | Optional model path used in cache key |

## Validation

| Rule | Result |
|---|---|
| Invalid JSON | `400 VALIDATION_ERROR` |
| Empty `text` | `400 VALIDATION_ERROR` |
| Text longer than 500 characters | `413 PAYLOAD_TOO_LARGE` |
| Too many requests | `429 RATE_LIMITED` |

## Cache Key

The cache key is deterministic.

Input:

```text
normalized_text | voice | model_path | format
```

Algorithm:

```text
sha256(normalized_text|voice|model_path|format)
```

## Runtime Files

Audio cache:

```text
runtime/audio_cache/<cache_key>.wav
runtime/audio_cache/<cache_key>.json
```

Voice job record:

```text
runtime/tts_jobs/<job_id>.json
```

## Cache Hit Flow

```text
POST /api/voice/jobs
→ create cache key
→ read runtime/audio_cache/<cache_key>.json
→ cache hit
→ create new job_id
→ write ready job record to runtime/tts_jobs/<job_id>.json
→ return audio_url
```

## Cache Miss Flow

```text
POST /api/voice/jobs
→ create cache key
→ no cache metadata found
→ create job_id
→ write processing job record
→ spawn Piper
→ write temporary WAV
→ move WAV to runtime/audio_cache/<cache_key>.wav
→ write runtime/audio_cache/<cache_key>.json
→ update job record to ready
→ return audio_url
```

## Success Response

Status:

```text
200 OK
```

Shape:

```json
{
  "status": "ready",
  "cache_hit": false,
  "job_id": "tts_uuid",
  "audio_url": "/api/voice/jobs/tts_uuid/audio",
  "voice": "tifa-default",
  "model": "en_US-libritts-high.onnx"
}
```

## Status Values

```text
queued
processing
ready
failed
```

Current note:

- The route can return `ready` after synchronous generation.
- `queued` is part of the contract for future async worker support.

## Error Responses

| Status | Code | Meaning |
|---:|---|---|
| 400 | `VALIDATION_ERROR` | Invalid JSON or empty text |
| 413 | `PAYLOAD_TOO_LARGE` | Text exceeds max length |
| 429 | `RATE_LIMITED` | Too many voice requests |
| 504 | `TTS_TIMEOUT` | Piper timed out |
| 500 | `TTS_GENERATION_FAILED` | Piper failed |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

---

# 9. `GET /api/voice/jobs/{jobId}`

Reads the status of a voice job.

## Purpose

This endpoint returns the filesystem job record for a given voice job ID.

## Implementation

```text
app/api/voice/jobs/[jobId]/route.ts
```

## Path Parameters

| Parameter | Required | Description |
|---|---:|---|
| `jobId` | yes | Voice job ID returned by `POST /api/voice/jobs` |

Example:

```text
GET /api/voice/jobs/tts_123
```

## Success Response

Status:

```text
200 OK
```

Shape:

```json
{
  "job_id": "tts_uuid",
  "status": "ready",
  "cache_key": "sha256-cache-key",
  "audio_url": "/api/voice/jobs/tts_uuid/audio",
  "error": null,
  "voice": "tifa-default",
  "model": "en_US-libritts-high.onnx",
  "created_at": "ISO-8601",
  "updated_at": "ISO-8601"
}
```

## Error Responses

| Status | Code | Meaning |
|---:|---|---|
| 400 | `VALIDATION_ERROR` | Job ID is missing |
| 404 | `VALIDATION_ERROR` | Voice job not found |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

---

# 10. `GET /api/voice/jobs/{jobId}/audio`

Fetches the generated binary WAV audio for a completed voice job.

## Purpose

The frontend uses this endpoint to play the generated audio through the browser `Audio` API.

## Implementation

```text
app/api/voice/jobs/[jobId]/audio/route.ts
```

## Path Parameters

| Parameter | Required | Description |
|---|---:|---|
| `jobId` | yes | Voice job ID returned by `POST /api/voice/jobs` |

Example:

```text
GET /api/voice/jobs/tts_123/audio
```

## Flow

```text
GET /api/voice/jobs/{jobId}/audio
→ read runtime/tts_jobs/<job_id>.json
→ require status=ready
→ resolve runtime/audio_cache/<cache_key>.wav
→ return binary WAV response
```

## Success Response

Status:

```text
200 OK
```

Headers:

```text
Content-Type: audio/wav
Cache-Control: public, max-age=86400
```

Body:

```text
Binary WAV audio
```

## Error Responses

| Status | Code | Meaning |
|---:|---|---|
| 400 | `VALIDATION_ERROR` | Job ID is missing |
| 404 | `VALIDATION_ERROR` | Voice job not found |
| 409 | `VALIDATION_ERROR` | Voice job is not ready |
| 404 | `INTERNAL_ERROR` | Audio file not found in cache |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

---

# 11. `GET /api/health`

Healthcheck endpoint.

## Purpose

Checks whether the local TradeVibe service and its local dependencies are healthy enough to operate.

## Implementation

```text
app/api/health/route.ts
```

## Expected Checks

The health endpoint is expected to check local service dependencies such as:

- Runtime directories
- Ollama availability
- Piper availability

The runtime check verifies the existence of all critical directories: `runtime/`, `runtime/daily_vibes/`, `runtime/logs/`, `runtime/audio_cache/`, and `runtime/tts_jobs/`.

## Success / Degraded Response

Status:

```text
200 OK
```

Used when the overall service status is:

```text
ok
degraded
```

Shape:

```json
{
  "status": "ok",
  "service": "tradevibe",
  "timestamp": "ISO-8601",
  "checks": {
    "runtime": {
      "status": "ok",
      "details": {}
    },
    "ollama": {
      "status": "ok",
      "details": {}
    },
    "piper": {
      "status": "ok",
      "details": {}
    }
  }
}
```

## Down Response

Status:

```text
503 Service Unavailable
```

Used when the overall service status is:

```text
down
```

Shape is the same as above, with `status: "down"`.

---

## 12. Frontend Client Behavior

### Chat

Main frontend helper:

```text
lib/client-api.ts
```

Chat functions:

```text
streamTifaReply()
sendTifaMessage()
```

ChatTifa behavior:

```text
1. User sends a message.
2. ChatTifa adds the user message.
3. ChatTifa adds an empty Tifa placeholder message.
4. ChatTifa calls streamTifaReply().
5. If delta chunks arrive, ChatTifa updates the placeholder progressively.
6. If the stream completes, ChatTifa can play reply voice.
7. If the stream fails before usable text, ChatTifa may call sendTifaMessage().
```

### Voice

Voice functions:

```text
playTifaVoice()
playVoiceJobAudio()
createVoiceJob()
getVoiceJob()
playAudioUrl()
playLegacyVoice()
playBase64Audio()
```

Voice behavior:

```text
1. Try /api/voice/jobs.
2. If job returns ready + audio_url, play binary WAV URL.
3. If job is queued/processing, poll job status.
4. If job path fails, fall back to /api/voice?text=...
```

---

## 13. Smoke Test Coverage

Smoke test script:

```text
scripts/smoke-api.sh
```

NPM command:

```bash
npm run smoke:api
```

Current smoke coverage:

| Area | Checks |
|---|---|
| Health | `/api/health` returns 200 or 503 and includes `status` |
| Tifa non-streaming | invalid JSON, empty message, too-long message |
| Tifa streaming | invalid JSON, empty message, too-long message |
| Voice legacy | empty text, too-long text |
| Voice jobs | invalid JSON, empty text, too-long text, missing job status, missing job audio |
| Live optional | live `/api/tifa`, `/api/tifa/stream`, `/api/voice`, `/api/voice/jobs`, job status, and job audio |
| Rate-limit optional | Tifa and voice 429 checks |

Optional live smoke:

```bash
RUN_LIVE_SMOKE=1 npm run smoke:api
```

Optional rate-limit smoke:

```bash
RUN_RATE_LIMIT_SMOKE=1 npm run smoke:api
```

---

## 14. cURL Examples

### Healthcheck

```bash
curl -s http://127.0.0.1:3100/api/health | jq
```

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

### Create Voice Job

```bash
curl -s -X POST http://127.0.0.1:3100/api/voice/jobs \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello trader","voice":"tifa-default","format":"wav"}' | jq
```

### Read Voice Job

```bash
JOB_ID="tts_example"

curl -s "http://127.0.0.1:3100/api/voice/jobs/${JOB_ID}" | jq
```

### Download Voice Job Audio

```bash
JOB_ID="tts_example"

curl -s "http://127.0.0.1:3100/api/voice/jobs/${JOB_ID}/audio" \
  -o /tmp/tifa-voice.wav

file /tmp/tifa-voice.wav
```

---

## 15. Environment Variables Reference

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

TRADEVIBE_REPO_ROOT=/home/nexus/projects/tradevibe-org

TIFA_RATE_LIMIT_WINDOW_MS=60000
TIFA_RATE_LIMIT_MAX=20
VOICE_RATE_LIMIT_WINDOW_MS=60000
VOICE_RATE_LIMIT_MAX=10

QWEN_API_URL=
YOUTUBE_API_KEY=
SPOTIFY_CLIENT_ID=
SPOTIFY_SECRET=
```

---

## 16. Current API Limitations

### 16.1 Local Filesystem State

The following are stored locally:

```text
runtime/latest.json
runtime/daily_vibes/
runtime/audio_cache/
runtime/tts_jobs/
```

This is appropriate for local-first deployment but not enough for distributed production.

### 16.2 Voice Jobs Are Not Fully Async Yet

`POST /api/voice/jobs` is cache-first and returns job-shaped responses, but cache misses still generate audio synchronously.

Future target:

```text
POST /api/voice/jobs
→ write queued job
→ background worker generates audio
→ client polls status
→ client fetches audio
```

### 16.3 Rate Limiting Is Process-Local

The current limiter is in-memory. For multi-instance production, use Redis or external rate limiting.

### 16.4 No Auth / Session Persistence Yet

There is no user authentication and no persisted per-user chat history yet.

---

## 17. Recommended Validation After API Changes

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
