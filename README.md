# Tifa Assistant Framework

Tifa Assistant Framework is a local-first foundation for building streaming AI assistants with voice jobs, provider routing, guarded data access, and SaaS-ready contracts.

It runs without PostgreSQL, Redis, object storage, auth, or cloud provider keys by default. Optional SaaS components are scaffolded behind explicit environment flags.

## Core Capabilities

- Floating `TifaWidget` assistant UI.
- Streaming-first chat through Server-Sent Events.
- Non-streaming chat fallback.
- Local persistent chat sessions.
- Cache-first async voice jobs.
- Local TTS worker with heartbeat.
- Piper-compatible voice provider scaffold.
- LLM provider gateway with an Ollama-compatible provider.
- Safe PostgreSQL connector scaffold.
- Guarded Text-to-SQL planning scaffold.
- Tenant, usage, audit, and SaaS schema contracts.
- Healthcheck for local runtime, model endpoint, voice provider, worker state, and optional SaaS services.

## Tech Stack

- Next.js `15.5.15`
- React `19.1.0`
- TypeScript
- TailwindCSS
- Framer Motion
- Ollama-compatible local LLM endpoint
- Piper-compatible local TTS

## Stable Local APIs

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/tifa` | Non-streaming assistant chat |
| `POST` | `/api/tifa/stream` | SSE streaming assistant chat |
| `POST` | `/api/voice/jobs` | Create cache-first voice job |
| `GET` | `/api/voice/jobs/{jobId}` | Read voice job status |
| `GET` | `/api/voice/jobs/{jobId}/audio` | Fetch generated WAV audio |
| `GET` | `/api/health` | Local runtime and optional dependency health |

## Runtime Layout

```text
runtime/
├─ logs/
├─ audio_cache/
│  ├─ <cache_key>.wav
│  └─ <cache_key>.json
├─ tts_jobs/
│  └─ <job_id>.json
├─ chat_sessions/
│  ├─ session_<uuid>.json
│  └─ session_<uuid>.messages.jsonl
└─ tts_worker_heartbeat.json
```

## Install

```bash
git clone https://github.com/tungpastry/tifa-assistant-framework.git
cd tifa-assistant-framework
cp .env.example .env
npm install
bash scripts/prepare-runtime.sh
```

## Environment

```env
TIFA_TIMEZONE=Asia/Ho_Chi_Minh
TIFA_RUNTIME_DIR=runtime
HOST=0.0.0.0
PORT=3100
TIFA_BASE_URL=http://127.0.0.1:3100

TIFA_RUNTIME_MODE=local
TIFA_SAAS_MODE=0
TIFA_LOCAL_FIRST=1
TIFA_DEFAULT_TENANT_ID=local
TIFA_DEFAULT_ASSISTANT_ID=tifa-assistant
TIFA_DEFAULT_LOCALE=en-US

OLLAMA_URL=http://127.0.0.1:11434
TIFA_API_URL=http://127.0.0.1:11434/api/generate
TIFA_MODEL=gemma3:1b
TIFA_TIMEOUT_MS=20000
TIFA_PROMPT_PATH=prompts/TIFA_RUNTIME.md

PIPER_BIN=/home/nexus/piper-env/bin/piper
PIPER_MODEL=/home/nexus/piper/voices/en_US-libritts-high.onnx
PIPER_TIMEOUT_MS=10000
```

## Development

```bash
npm run dev
```

Use another port:

```bash
PORT=3202 npm run dev
```

## Production

```bash
npm run build
npm run start
```

Run the local TTS worker:

```bash
npm run tts:worker
```

Process queued jobs once:

```bash
npm run tts:worker:once
```

## Validation

```bash
git diff --check
npm run lint
npm run build
npm run smoke:api
node --check scripts/tts-worker.mjs
npm run tts:worker:once
```

Optional live smoke:

```bash
RUN_LIVE_SMOKE=1 npm run smoke:api
```

## Module Boundaries

- `lib/tifa-core`
- `lib/tifa-runtime`
- `lib/tifa-provider-gateway`
- `lib/tifa-voice`
- `lib/tifa-data-connectors`
- `lib/tifa-widget`

See [Module Boundaries](docs/MODULE_BOUNDARIES.md).

## SaaS Mode

SaaS mode is scaffolded but disabled by default:

```env
TIFA_RUNTIME_MODE=local
TIFA_SAAS_MODE=0
TIFA_LOCAL_FIRST=1
TIFA_PG_ENABLED=0
TIFA_REDIS_ENABLED=0
TIFA_OBJECT_STORAGE_ENABLED=0
TIFA_TEXT_TO_SQL_ENABLED=0
```

See [SaaS Mode](docs/SAAS_MODE.md).

## License

MIT
