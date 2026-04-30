# Tifa Framework Roadmap

The roadmap keeps Tifa useful as the reference local-first app while progressively extracting framework capabilities.

## Phase 1: Blueprint And Contracts

- Document SaaS architecture, security model, voice providers, and Text-to-SQL guardrails.
- Add shared TypeScript contracts for tenants, assistants, sessions, messages, tool calls, voice providers, usage, and errors.
- Preserve current runtime behavior.

## Phase 2: Provider Gateway

- Add a normalized LLM provider interface.
- Support model profiles for Ollama, OpenAI, Gemini, Qwen API, and local Qwen/Ollama models.
- Add router policies:
  - `local-first`
  - `cloud-first`
  - `cost-aware`
  - `privacy-first`
- Keep existing `TIFA_API_URL` path compatible.

## Phase 3: Data Connectors

- Add optional PostgreSQL connector scaffold.
- Enforce read-only, allowlisted, limited, audited query execution.
- Prepare semantic financial views for Fx-Sentinel and related repositories.

## Phase 4: Text-To-SQL Guardrails

- Add QueryPlan-first pipeline.
- Retrieve schema and semantic context before SQL compilation.
- Validate SQL statically before connector execution.
- Return citations/evidence in summaries.

## Phase 5: Voice Providers

- Abstract the current Piper runtime.
- Add viPiper scaffold for Vietnamese Piper-compatible models.
- Add VieNeu HTTP facade provider.
- Preserve async job semantics and local cache compatibility.

## Phase 6: SaaS Persistence

- Draft tenant-aware PostgreSQL schema.
- Add database-backed persistence adapters behind existing contracts.
- Add Redis-backed rate limits and queue coordination.
- Add object storage adapter for generated voice assets.

## Phase 7: SaaS Operations

- Expand health checks with optional dependency states.
- Define metrics and structured logs.
- Add admin policies, quotas, usage dashboards, and audit review.

## Phase 8: UI Framework Readiness

- Keep TifaWidget as the reference widget.
- Extract hooks and client helpers only when stable.
- Add future UI affordances for provider/model badges, citations, tool traces, SQL previews, voice selector, quotas, and session folders.

## Repository Adoption Order

1. Tifa: reference widget and local-first compatibility.
2. Fx-Sentinel: PostgreSQL financial connector and Text-to-SQL reference.
3. nexus-trade-radar: market dashboard and realtime signal assistant.
4. ZenoraAI: 2D persona/assistant integration.
5. nexuscrypto: crypto connector and dashboard assistant.

