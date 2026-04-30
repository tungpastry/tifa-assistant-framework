# Tifa Assistant Framework

Tifa Assistant Framework is the planned reusable assistant foundation extracted from the hardened Tifa TifaWidget runtime. Tifa remains the reference local-first application while the framework grows service-first modules that can be reused by Fx-Sentinel, nexus-trade-radar, ZenoraAI, nexuscrypto, and future products.

This document is a blueprint, not a claim that the repository is production SaaS ready today.

## Current Tifa Runtime

Tifa currently runs as a single-node, local-first assistant:

| Area | Current behavior |
| --- | --- |
| Runtime state | Filesystem under `runtime/` |
| Chat sessions | Local JSON and JSONL files under `runtime/chat_sessions/` |
| Voice jobs | Local job records under `runtime/tts_jobs/` |
| Audio cache | Local WAV files and metadata under `runtime/audio_cache/` |
| Chat model | Ollama-compatible endpoint through `TIFA_API_URL` |
| Streaming | SSE-first route at `/api/tifa/stream` with non-streaming fallback |
| Voice | Piper TTS through async job semantics and legacy fallback |
| Cleanup | `scripts/cleanup-runtime.sh` for local cache/job/log retention |
| Rate limit | In-memory process-local buckets |
| Tenancy | Not implemented |
| Auth | Not implemented |

The local runtime is intentionally useful and should keep working while the framework grows. Existing features such as the floating widget, mood avatars, streaming chat, local persistent sessions, voice job cache, and TTS worker must remain compatible.

## SaaS Target Runtime

The target SaaS runtime moves durable state and coordination out of local process memory and local disk:

| Area | Target service |
| --- | --- |
| System of record | PostgreSQL |
| Cache and coordination | Redis for rate limits, queue coordination, idempotency, and hot metadata |
| Audio assets | Object storage for generated voice files |
| Sessions/messages | Tenant-aware PostgreSQL tables |
| Tool calls | Tenant-aware audit trail with inputs, outputs, duration, and status |
| Voice jobs | Durable queue plus object storage output |
| LLM routing | Multi-provider gateway with local, cloud, privacy, and cost policies |
| Data access | Safe financial connectors with allowlisted views and read-only execution |
| Metering | Usage events for chat, tokens, tools, voice, storage, and connector queries |
| Observability | Metrics, structured logs, traces, health categories, and audit events |
| Admin | Policies, API keys, provider key metadata, quotas, and billing/account views |

Tifa should be able to run in local-first mode without PostgreSQL, Redis, or object storage. SaaS mode should be opt-in through configuration and deployment wiring.

## Framework Modules

The reusable framework should be split into clear module boundaries:

| Module | Responsibility |
| --- | --- |
| `tifa-core` | Shared assistant domain types, errors, events, policies, and contracts |
| `tifa-runtime` | Session/message persistence abstraction, request lifecycle, audit hooks, and runtime services |
| `tifa-provider-gateway` | LLM provider interface, router policy, model profiles, health, cost, and fallback |
| `tifa-data-connectors` | PostgreSQL and future TimescaleDB, crypto, forex, stocks, and news connectors |
| `tifa-text-to-sql` | Intent classification, QueryPlan generation, semantic layer, SQL compiler, and guardrails |
| `tifa-voice` | Voice provider interface, Piper, viPiper, VieNeu facade, cache, jobs, and voice assets |
| `tifa-widget-react` | TifaWidget reference widget, React hooks, streaming client, voice client, and UI extension points |
| `tifa-sdk` | Browser/server SDK for sessions, messages, streams, tools, voice, and usage events |
| `tifa-admin-console` | Tenant, assistant, user, API key, provider key, usage, policy, and audit administration |

The repository can start with `lib/*` scaffold modules and later extract packages when module contracts stabilize.

## Target Repository Roles

| Repository | Role |
| --- | --- |
| Tifa | Reference widget and local-first baseline |
| Fx-Sentinel | Finance/news/PostgreSQL/Text-to-SQL reference integration |
| nexus-trade-radar | Market dashboard and realtime signal assistant |
| ZenoraAI | 2D assistant/persona reference integration |
| nexuscrypto | Crypto dashboard and connector reference integration |

## Compatibility Rules

- Keep `TIFA_API_URL` and `TIFA_MODEL` working for local Ollama-compatible chat.
- Keep `/api/tifa` and `/api/tifa/stream` compatible with the current client.
- Keep async voice job semantics and legacy voice fallback.
- Keep local chat sessions working without a database.
- Do not require Redis, PostgreSQL, object storage, or auth for default Tifa smoke tests.
- Prefer additive contracts and compatibility shims over broad rewrites.

