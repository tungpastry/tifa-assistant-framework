# P5 SaaS Extraction Plan

P5 turns the monorepo-style framework into explicit internal package boundaries
without breaking the local-first Next.js app.

## Current State

- The Next.js app remains the reference runtime and validation surface.
- `lib/tifa-*` directories expose public barrels for future package extraction.
- Compatibility imports such as `@/lib/client-api`, `@/lib/tts-cache`,
  `@/lib/llm/*`, and `@/lib/data-connectors/*` remain supported.
- PostgreSQL, Redis, object storage, SaaS mode, auth, and cloud providers are
  disabled by default.

## Target Internal Packages

| Package | Current path | Extraction goal |
| --- | --- | --- |
| `@tifa-assistant/core` | `lib/tifa-core` | Framework contracts, policies, events, errors, usage and audit types |
| `@tifa-assistant/widget-react` | `lib/tifa-widget` | React hooks, browser client helpers, widget types and extension points |
| `@tifa-assistant/provider-gateway` | `lib/tifa-provider-gateway` | Provider contracts, Ollama/OpenAI/Gemini/Qwen adapters, router policies |
| `@tifa-assistant/voice` | `lib/tifa-voice` | Voice contracts, provider registry, TTS jobs, local worker/cache helpers |
| `@tifa-assistant/data-connectors` | `lib/tifa-data-connectors` | Connector contracts, PostgreSQL connector, SQL safety, Text-to-SQL guardrails |
| `@tifa-assistant/runtime` | `lib/tifa-runtime` | Runtime adapters, local persistence, tenant context, SaaS persistence boundaries |

## Extraction Phases

1. Stabilize public barrels and README ownership notes.
2. Move new code to `@/lib/tifa-*` imports while preserving old compatibility paths.
3. Add package-level tests for public exports.
4. Split packages into a workspace or publishable package layout.
5. Migrate consuming repositories one at a time.
6. Remove compatibility exports only after all consuming repositories are updated.

## Validation Gates

Every extraction step must pass:

```bash
git diff --check
npm run lint
npm run build
BASE_URL=http://127.0.0.1:3205 npm run smoke:api
node --check scripts/tts-worker.mjs
npm run tts:worker:once
```

For data connector changes, also test `/api/data/query-plan` and disabled-mode
`/api/data/query` locally before any live database execution.

## Non-Goals For P5

- No npm publishing.
- No forced monorepo/workspace migration.
- No SaaS mode activation.
- No automatic PostgreSQL, Redis, object storage, auth, or Cloudflare setup.
- No removal of compatibility imports.
