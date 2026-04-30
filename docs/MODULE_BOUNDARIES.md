# Tifa Module Boundaries

This repo contains framework scaffolds in one Next.js codebase. The `lib/tifa-*` directories define package boundaries for future extraction while preserving existing imports.

| Module | Purpose |
| --- | --- |
| `lib/tifa-core` | Shared assistant contracts, policies, events, usage, and errors |
| `lib/tifa-runtime` | Local runtime paths, sessions/messages, request helpers, worker status |
| `lib/tifa-provider-gateway` | LLM provider contracts, model profiles, router, provider adapters |
| `lib/tifa-voice` | Voice provider contracts, Piper/viPiper/VieNeu scaffolds, cache/job helpers |
| `lib/tifa-data-connectors` | Safe data connector contracts, PostgreSQL scaffold, Text-to-SQL guardrails |
| `lib/tifa-widget` | Frontend widget contracts for future React package extraction |

## Compatibility

Existing imports are intentionally left in place:

- `@/lib/tifa-runtime`
- `@/lib/tts-cache`
- `@/lib/client-api`
- `@/lib/data-connectors/*`
- `@/lib/llm/*`
- `@/lib/voice/*`

The new module directories mostly re-export current implementations. This keeps the API routes stable and lets framework consumers adopt the clearer boundaries gradually.
