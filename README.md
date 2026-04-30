<div align="center">
  <img src="public/logo.png" alt="TradeVibe Logo" width="200"/>
</div>

# Tifa Assistant Framework / TradeVibe Reference App

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-15.5.15-black.svg)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)](https://www.python.org/)

Tifa Assistant Framework is a reusable assistant foundation with TradeVibe kept as the local-first reference app. The reference app combines a daily “vibe” dashboard, motivational quote, playlist bundle, voice clip, and the **ChatTifa** floating assistant to help traders stay focused, calm, and consistent.

The current codebase is designed for a **self-hosted single-node workstation/server** using:

- **Next.js 15.5.15**
- **React 19.1.0**
- **TypeScript**
- **TailwindCSS**
- **Framer Motion**
- **Ollama local LLM**
- **Piper TTS**
- **Python Insight Engine**
- **Filesystem runtime artifacts**

This repo is not yet a complete multi-tenant SaaS platform. It preserves TradeVibe local-first behavior while adding framework boundaries and SaaS-ready scaffolds for future deployments.

---

## Table of Contents

- [Core Features](#core-features)
- [Architecture Summary](#architecture-summary)
- [Tech Stack](#tech-stack)
- [Runtime Directory Layout](#runtime-directory-layout)
- [API Surface](#api-surface)
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Installation](#installation)
- [Usage](#usage)
- [Testing and Validation](#testing-and-validation)
- [Current Limitations](#current-limitations)
- [Roadmap](#roadmap)
- [Documentation](#documentation)
- [License](#license)
- [Contact](#contact)

---

## Core Features

### Daily Vibe Dashboard

- Daily trader mood
- Motivational quote / daily vibe
- Spotify playlist embed
- YouTube playlist embed
- Daily WAV voice clip loaded from runtime artifacts
- Fast frontend load by reading pre-generated files from `runtime/`

### ChatTifa Floating Assistant

- Floating chat widget
- Mood-synced avatar: `/tifa_<mood>.png`
- Minimize / expand control
- Typing indicator
- Auto-scroll message list
- Voice on/off toggle
- Auto greeting voice
- Auto reply voice
- Streaming-first chat UX
- Non-streaming fallback when needed

### Local AI

- Tifa chat uses a local Ollama-compatible endpoint.
- Default model is configured through `TIFA_MODEL`.
- Default API URL is configured through `TIFA_API_URL`.
- Runtime prompt is loaded from `prompts/TIFA_RUNTIME.md`.

### Voice / TTS

TradeVibe currently supports two voice paths:

1. **Preferred path: cache-first voice jobs**
   - `POST /api/voice/jobs`
   - `GET /api/voice/jobs/{jobId}`
   - `GET /api/voice/jobs/{jobId}/audio`

2. **Fallback path: legacy base64 voice endpoint**
   - `GET /api/voice?text=...`

The frontend calls `playTifaVoice()`, which tries cached voice jobs first and falls back to the legacy voice endpoint if needed. Cache misses are queued as local filesystem jobs and processed by `scripts/tts-worker.mjs` through `npm run tts:worker` or `npm run tts:worker:once`.

---

## Architecture Summary

TradeVibe follows a local-first, decoupled architecture:

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

### Main Runtime Flows

#### 1. Daily Vibe Flow

```text
Python Insight Engine
→ runtime/latest.json
→ runtime/daily_vibes/music_*.json
→ runtime/daily_vibes/vibe_*.json
→ runtime/daily_vibes/vibe_*.wav
→ GET /api/today
→ app/page.tsx
```

#### 2. ChatTifa Streaming Flow

```text
ChatTifa.tsx
→ streamTifaReply()
→ POST /api/tifa/stream
→ Ollama /api/generate with stream=true
→ SSE start/delta/done/error events
→ progressive UI rendering
```

#### 3. ChatTifa Fallback Flow

```text
ChatTifa.tsx
→ stream fails before usable response
→ sendTifaMessage()
→ POST /api/tifa
→ non-streaming Ollama response
```

#### 4. Tifa Voice Job Flow

```text
ChatTifa.tsx
→ playTifaVoice()
→ playVoiceJobAudio()
→ POST /api/voice/jobs
→ cache hit or generate audio
→ GET /api/voice/jobs/{jobId}/audio
→ browser audio playback
```

---

## Tech Stack

### Frontend

- Next.js `15.5.15`
- React `19.1.0`
- React DOM `19.1.0`
- TypeScript
- TailwindCSS
- Framer Motion
- Lucide React
- React Icons
- React Simple Typewriter

### Backend / API

- Next.js App Router Route Handlers
- Node.js runtime for local filesystem and child process support
- Local Ollama HTTP API
- Piper TTS via spawned local binary
- Filesystem runtime storage

### Python Pipeline

- Python `3.10+`
- Daily Insight Engine
- Playlist / vibe generation
- Runtime artifact writing

---

## Runtime Directory Layout

TradeVibe uses a git-ignored `runtime/` directory as its local artifact store.

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
├─ tts_jobs/
│  └─ <job_id>.json
└─ chat_sessions/
   ├─ session_<uuid>.json
   └─ session_<uuid>.messages.jsonl
```

### Runtime Purpose

| Path | Purpose |
|---|---|
| `runtime/latest.json` | Manifest pointing to the latest generated daily vibe artifacts |
| `runtime/daily_vibes/` | Daily generated music, vibe, and WAV files |
| `runtime/logs/` | Pipeline/runtime logs |
| `runtime/audio_cache/` | Cached TTS WAV files and metadata |
| `runtime/tts_jobs/` | Filesystem voice job records |
| `runtime/chat_sessions/` | Local ChatTifa session metadata and message history |

---

## API Surface

### Daily Vibe

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/today` | Load the latest daily vibe bundle |

### Tifa Chat

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/tifa` | Non-streaming Tifa chat fallback |
| `POST` | `/api/tifa/stream` | Preferred SSE streaming Tifa chat endpoint |
| `POST` | `/api/chat/sessions` | Create local ChatTifa session |
| `GET` | `/api/chat/sessions/{sessionId}` | Read local ChatTifa session metadata |
| `GET` | `/api/chat/sessions/{sessionId}/messages` | Read local ChatTifa messages |
| `POST` | `/api/chat/sessions/{sessionId}/messages` | Append local ChatTifa message |

### Voice / TTS

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/voice?text=...` | Legacy base64 Piper voice endpoint |
| `POST` | `/api/voice/jobs` | Create cache-first voice job |
| `GET` | `/api/voice/jobs/{jobId}` | Read voice job status |
| `GET` | `/api/voice/jobs/{jobId}/audio` | Fetch generated binary WAV audio |

### Ops

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/health` | Healthcheck for runtime, Ollama, and Piper dependencies |

---

## Prerequisites

- Ubuntu/Debian Linux server or local development machine
- Node.js `>=18.18.0`
- npm
- Python `>=3.10`
- Ollama installed and running locally
- A local Ollama model pulled, for example `gemma3:1b`
- Piper TTS installed locally
- Piper voice model available on disk
- Optional: YouTube Data API key
- Optional: Spotify API credentials

---

## Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Important variables:

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

YOUTUBE_API_KEY=
SPOTIFY_CLIENT_ID=
SPOTIFY_SECRET=
```

---

## Installation

```bash
git clone https://github.com/tungpastry/tifa-assistant-framework.git
cd tifa-assistant-framework

cp .env.example .env

npm ci
bash scripts/prepare-runtime.sh
```

Check local AI dependencies:

```bash
ollama list
test -x "$PIPER_BIN"
test -f "$PIPER_MODEL"
```

---

## Usage

### Development Mode

```bash
npm run dev
```

This prepares the `runtime/` directory and starts the Next.js development server at:

```text
http://localhost:3100
```

### Production Build

```bash
npm run build
npm run start
```

The `start` script uses `start.sh`.

---

## Testing and Validation

### Lint

```bash
npm run lint
```

### Build

```bash
npm run build
```

### Full Local Check

```bash
npm run check
```

### API Smoke Tests

```bash
npm run smoke:api
```

Optional live smoke test:

```bash
RUN_LIVE_SMOKE=1 npm run smoke:api
```

Optional rate-limit smoke test:

```bash
RUN_RATE_LIMIT_SMOKE=1 npm run smoke:api
```

---

## Current Limitations

TradeVibe is currently optimized for a **single-node local deployment**.

Important limitations:

- Runtime artifacts are stored on the local filesystem.
- TTS audio cache is stored on the local filesystem.
- Voice job records are stored on the local filesystem.
- Chat history is stored on the local filesystem.
- Rate limiting is in-memory and process-local.
- Voice jobs are cache-first and processed by a local filesystem worker.
- There is no user authentication yet.
- There is no multi-tenant SaaS control plane yet.
- There is no Redis-backed distributed state yet.
- Piper is the current TTS engine; Vietnamese TTS can be added later.

For multi-instance production, replace local in-memory/filesystem state with Redis, database-backed job state, object storage, or platform-level services.

---

## Roadmap

- [x] Decouple Python pipeline and Next.js frontend
- [x] Add runtime artifact model
- [x] Add daily vibe dashboard
- [x] Integrate ChatTifa floating assistant
- [x] Integrate local Ollama chat endpoint
- [x] Add standardized API error envelope
- [x] Add local rate limiting
- [x] Add `/api/tifa/stream` SSE streaming endpoint
- [x] Switch ChatTifa frontend to streaming-first replies
- [x] Add fallback from streaming to non-streaming Tifa replies
- [x] Add Piper-based legacy voice endpoint
- [x] Add cache-first voice job API
- [x] Add filesystem TTS audio cache
- [x] Add filesystem voice job records
- [x] Move voice jobs from synchronous cache-miss generation to a local async worker
- [x] Add cleanup/retention policy for runtime cache, jobs, and logs
- [x] Add local filesystem ChatTifa history
- [ ] Add Redis-backed rate limiting for production multi-instance deployment
- [ ] Add user authentication
- [ ] Add Vietnamese TTS voice profile
- [ ] Expand music providers
- [ ] Prepare reusable Tifa Assistant Framework packages

---

## Documentation

Detailed technical documentation is available in the `docs/` directory:

- [Architecture](docs/architecture.md)
- [API Reference](docs/api-reference.md)
- [Deployment](docs/deployment.md)
- [Troubleshooting](docs/troubleshooting.md)
- [Gemini CLI DevOps Guide](docs/GEMINI_DEVOPS.md)

---

## Suggested Developer Workflow

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

---

## License

This project is licensed under the [MIT License](LICENSE).

---

## Contact

Created by [tungpastry](mailto:bakerthanhtung@gmail.com).
