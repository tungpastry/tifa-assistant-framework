# Tifa Security Model

This document describes the current security posture and the target SaaS security model. It is a design scaffold, not a completed security certification.

## Current Local-First Security Boundary

TradeVibe currently assumes a trusted single-node deployment:

- Local filesystem runtime under `runtime/`.
- Local Ollama-compatible model endpoint through `TIFA_API_URL`.
- Local Piper binary and model paths.
- Local chat history files.
- Local TTS job and audio cache files.
- In-memory rate limits.
- No user authentication.
- No tenant isolation.

This is appropriate for a self-hosted personal or internal workstation/server deployment. It is not sufficient for multi-tenant SaaS without additional controls.

## SaaS Security Principles

- Every tenant-owned row includes `tenant_id`.
- Tenant context is required before reading or writing tenant-owned data.
- PostgreSQL Row Level Security should be enabled for SaaS mode tables.
- Raw secrets are never stored in application tables.
- Provider keys use secret manager references through `secret_ref`.
- API keys store only hashes and metadata.
- Tool calls and data connector executions are audited.
- Financial data access is read-only and allowlisted.
- Text-to-SQL uses QueryPlan JSON and static validation before execution.
- Optional providers disabled by configuration must not affect readiness.
- Logs and audit events must avoid private prompts, secrets, and full raw payloads unless explicitly configured for a secure environment.

## Identity And Access

Target SaaS identity model:

| Entity | Purpose |
| --- | --- |
| Tenant | Billing and isolation boundary |
| User | Human account |
| Tenant membership | Role and permission association |
| Assistant | Tenant-scoped assistant configuration |
| API key | Programmatic access with hashed secret |
| Provider key metadata | BYOK metadata pointing to an external secret reference |

## BYOK Provider Keys

Provider key records should store:

- Tenant ID.
- Provider name.
- Display name.
- Secret reference.
- Scope metadata.
- Created/rotated timestamps.

Provider key records must not store:

- Raw API keys.
- Bearer tokens.
- Private key material.

## Data Connector Security

Financial database connectors must:

- Execute read-only queries only.
- Block write DDL/DML.
- Block multiple statements.
- Enforce statement timeout.
- Enforce row limit.
- Restrict queries to allowlisted views.
- Include tenant context when SaaS mode is enabled.
- Write audit events for every query attempt, including rejected attempts.

## Text-To-SQL Security

Natural language must not directly become executable SQL. The safe pipeline is:

1. Classify intent.
2. Retrieve semantic context.
3. Produce QueryPlan JSON.
4. Compile SQL from QueryPlan.
5. Validate SQL with static guardrails.
6. Execute through the read-only connector.
7. Summarize with evidence.
8. Record tool call, usage, and audit events.

## Voice Security

Voice providers should expose:

- Provider name.
- License class.
- Streaming support.
- Voice cloning support.
- Health status.

For SaaS mode, generated audio should move to object storage with lifecycle policies. VieNeu-TTS should run behind a separate facade service. Do not download or execute heavy model code inside Next.js request handlers.

## Audit Event Categories

- Authentication and API key events.
- Tenant/admin policy changes.
- Assistant configuration changes.
- Provider routing decisions.
- Tool calls.
- Data connector query attempts.
- Text-to-SQL rejections.
- Voice job creation and failures.
- Rate limit and budget limit events.

## Operational Security Readiness

SaaS health and observability should distinguish required local dependencies from optional SaaS dependencies:

- Required local checks can fail readiness when `down`.
- Optional SaaS checks should report `disabled` when not configured.
- Optional checks should become `degraded` or `down` only when explicitly enabled.
- Security-sensitive telemetry should use request IDs and metadata instead of raw secrets or full private payloads.
