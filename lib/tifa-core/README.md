# tifa-core

Shared assistant domain contracts:

- tenants
- assistant configs
- sessions
- messages
- policies
- usage events
- audit/framework events
- framework error envelopes

This module currently re-exports the stable scaffold contracts from `lib/framework/*`.

## Public Import

```ts
import {
  createLocalAssistantConfig,
  TIFA_FRAMEWORK_MODULES,
  type AssistantConfig,
  type AssistantMessage,
  type UsageEvent,
} from "@/lib/tifa-core";
```

## Owns

- Cross-repo assistant contracts.
- Runtime configuration parsing that defaults to local-first mode.
- Error, event, audit, tenant, and usage types.
- Module boundary catalog used by future package extraction work.

## Does Not Own

- Next.js route handlers.
- Provider SDK clients.
- Browser UI behavior.
- Database migrations or external services.

## Extraction Notes

This should be the first package extracted because it has the fewest runtime
dependencies. Keep it framework-only and avoid importing Next.js, React, or
provider SDKs from this module.
