# Architecture

Tifa Assistant Framework is a local-first assistant runtime with optional SaaS scaffolds.

## Layers

| Layer | Responsibility |
| --- | --- |
| Widget | `TifaWidget`, client API helpers, browser voice playback |
| Runtime | sessions, messages, runtime directories, worker status |
| Provider gateway | LLM provider interface, routing policy, Ollama-compatible provider |
| Voice | async voice jobs, cache, local worker, provider contracts |
| Data connectors | safe connector contracts, PostgreSQL scaffold, query validation |
| SaaS scaffolds | tenants, usage, audit, DB schema, optional adapters |

## Local Flow

```text
TifaWidget
  -> /api/tifa/stream
  -> Ollama-compatible endpoint
  -> SSE start/delta/done events
```

Voice flow:

```text
Client
  -> POST /api/voice/jobs
  -> runtime/tts_jobs/<job>.json
  -> scripts/tts-worker.mjs
  -> runtime/audio_cache/<cache>.wav
  -> GET /api/voice/jobs/{jobId}/audio
```

## Runtime Directories

Required local directories:

- `runtime/`
- `runtime/logs/`
- `runtime/audio_cache/`
- `runtime/tts_jobs/`
- `runtime/chat_sessions/`

The local runtime does not require any dashboard artifact generation.

## Optional SaaS Services

Optional services stay disabled unless explicitly configured:

- PostgreSQL
- Redis
- object storage
- external auth
- cloud model providers
