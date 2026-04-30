# tifa-runtime

Runtime boundary for local-first and future SaaS persistence:

- local runtime paths
- TifaWidget session/message persistence
- Tifa request parsing and prompt helpers
- local TTS worker status

Existing imports such as `@/lib/tifa-runtime` continue to resolve to the compatibility file `lib/tifa-runtime.ts`. This directory is the forward-looking package boundary.

## Public Import

```ts
import {
  createTenantContext,
  getRuntimeDir,
  listChatSessions,
  readChatSession,
  getTtsWorkerStatus,
} from "@/lib/tifa-runtime";
```

## Owns

- Local filesystem runtime paths.
- Local chat session/message persistence contracts.
- Tenant context helper for local and future SaaS mode.
- Redis rate limiter and PostgreSQL session adapter scaffolds.
- TTS worker status reading, but not synthesis itself.

## Does Not Own

- Provider routing or model selection.
- TTS provider implementations.
- React widget presentation.
- SaaS service activation.

## Extraction Notes

Keep `@/lib/tifa-runtime` compatibility in place until all existing route
handlers move to the directory import. A future package should expose adapters
behind interfaces and keep local filesystem persistence as the default adapter.
