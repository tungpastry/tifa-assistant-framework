# Tifa SaaS Architecture

This document describes the target SaaS architecture for Tifa Assistant Framework. Tifa remains local-first today; SaaS services are introduced as optional foundations.

## Runtime Comparison

| Capability | Current Tifa | SaaS target |
| --- | --- | --- |
| Tenants | Single local app | `tenants` table plus tenant context on every owned resource |
| Users | Browser-only usage | Users, memberships, roles, and assistant permissions |
| Sessions | Filesystem JSON | PostgreSQL session/message tables |
| Voice jobs | Filesystem job files | Queue-backed jobs with object storage output |
| Audio | Local WAV cache | Object storage with signed URLs and lifecycle policies |
| Rate limits | In-memory bucket | Redis and durable quota policies |
| Provider keys | Environment variables | BYOK-ready metadata with `secret_ref`, never raw secrets |
| Tool calls | Not centralized | Tenant-aware tool call and audit tables |
| Usage | Not metered | Usage events for tokens, messages, voice, tools, storage, and connectors |
| Observability | Health route and logs | Metrics, traces, structured logs, and audit streams |

## Service Layers

### Presentation Layer

Tifa's `components/TifaWidget.tsx` remains the reference UI. The target UI layer should evolve into:

- React widget package with stable props.
- Client SDK for sessions, streams, voice jobs, and tool traces.
- Optional UI surfaces for provider badges, citations, SQL previews, and quotas.
- Accessibility and reduced-motion support.

### Assistant Runtime Layer

The runtime layer owns assistant behavior and persistence contracts:

- Sessions and messages.
- Streaming events.
- Provider routing and fallback.
- Tool calls.
- Voice jobs.
- Usage events.
- Audit events.

Local mode can use filesystem stores. SaaS mode should use PostgreSQL, Redis, queues, and object storage.

### SaaS Layer

The SaaS layer introduces:

- Tenants.
- Users and memberships.
- Assistant configuration.
- API keys with secret hashes.
- Provider key metadata with `secret_ref`.
- Usage metering and budget limits.
- Rate limit policies.
- Admin policies and audit review.

### Data Connector Layer

The data connector layer provides safe access to financial datasets:

- PostgreSQL connector as the first implementation.
- Read-only SQL execution.
- View allowlists.
- Statement timeout and max rows.
- Tenant context enforcement when SaaS mode is enabled.
- Future adapters for TimescaleDB, crypto, forex, stocks, and news.

### Voice Layer

The voice layer keeps the current async job semantics while allowing multiple providers:

- Piper as the current local provider.
- viPiper as a Piper-compatible Vietnamese provider scaffold.
- VieNeu-TTS through a separate HTTP facade service.
- Object storage output for SaaS.
- Provider health and license class metadata.

Heavy model execution should not run inside Next.js request handlers.

## SaaS Request Flow

```text
Widget/SDK
  -> Tifa API Gateway
  -> Tenant/Auth/Policy Context
  -> Assistant Runtime
  -> Provider Gateway / Tool Runtime / Voice Runtime
  -> Usage Events + Audit Events
  -> PostgreSQL + Redis + Object Storage
```

## Default Deployment Modes

| Mode | Description |
| --- | --- |
| `local` | Current Tifa behavior, filesystem runtime, local Ollama, local Piper |
| `hybrid` | Local widget/runtime with optional cloud LLM or optional data connector |
| `saas` | Tenant-aware runtime backed by PostgreSQL, Redis, object storage, auth, metering, and admin policies |

## Non-Goals For The Current Scaffold

- Full auth provider integration.
- Full billing engine.
- Production Redis/object storage wiring.
- Automatic model downloads.
- Direct VieNeu model loading inside Next.js.
- Raw Text-to-SQL execution from natural language.

