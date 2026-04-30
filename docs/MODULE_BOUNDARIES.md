# Tifa Module Boundaries

This repo contains framework modules in one Next.js codebase. The `lib/tifa-*`
directories define the public package boundaries for future extraction while
preserving existing imports.

| Module | Purpose |
| --- | --- |
| `lib/tifa-core` | Shared assistant contracts, policies, events, usage, and errors |
| `lib/tifa-runtime` | Local runtime paths, sessions/messages, request helpers, worker status |
| `lib/tifa-provider-gateway` | LLM provider contracts, model profiles, router, provider adapters |
| `lib/tifa-voice` | Voice provider contracts, Piper/viPiper/VieNeu scaffolds, cache/job helpers |
| `lib/tifa-data-connectors` | Safe data connector contracts, PostgreSQL scaffold, Text-to-SQL guardrails |
| `lib/tifa-widget` | Frontend widget contracts for future React package extraction |

## Preferred Imports

New code should prefer module-boundary imports:

```ts
import { createLocalAssistantConfig } from "@/lib/tifa-core";
import { getRuntimeDir } from "@/lib/tifa-runtime";
import { createLocalFirstProviderGateway } from "@/lib/tifa-provider-gateway";
import { createDefaultVoiceProviderRegistry } from "@/lib/tifa-voice";
import { validateReadOnlySql } from "@/lib/tifa-data-connectors";
import { useTifaChat } from "@/lib/tifa-widget";
```

Route handlers may still use lower-level imports when the compatibility surface
has not been migrated yet. Do not move imports mechanically if it would blur
ownership or make the Next.js app harder to debug.

## Compatibility

Existing imports are intentionally left in place:

- `@/lib/tifa-runtime`
- `@/lib/tts-cache`
- `@/lib/client-api`
- `@/lib/data-connectors/*`
- `@/lib/llm/*`
- `@/lib/voice/*`

The new module directories mostly re-export current implementations. This keeps the API routes stable and lets framework consumers adopt the clearer boundaries gradually.

## Extraction Sequence

1. `tifa-core`: extract contracts first because it has no React, Next.js, or SDK dependency.
2. `tifa-widget`: extract hooks/client helpers next; keep `components/TifaWidget.tsx` as the reference implementation.
3. `tifa-provider-gateway`: extract provider contracts and adapters after provider health and streaming semantics stabilize.
4. `tifa-voice`: extract job/cache/provider contracts while preserving the current filesystem queue.
5. `tifa-data-connectors`: extract after Fx-Sentinel guarded query execution has live staging coverage.
6. `tifa-runtime`: extract last because it is closest to local filesystem behavior and SaaS persistence adapters.

## Rules

- Local-first defaults must remain usable without PostgreSQL, Redis, object storage, auth, or cloud keys.
- Optional SaaS services must stay behind explicit environment flags.
- Public types should be additive and backward compatible.
- Compatibility re-exports stay until consuming repositories migrate.
- Raw user SQL, provider secrets, and runtime private data never belong in package APIs.
