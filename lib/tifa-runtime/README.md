# tifa-runtime

Runtime boundary for local-first and future SaaS persistence:

- local runtime paths
- TifaWidget session/message persistence
- Tifa request parsing and prompt helpers
- local TTS worker status

Existing imports such as `@/lib/tifa-runtime` continue to resolve to the compatibility file `lib/tifa-runtime.ts`. This directory is the forward-looking package boundary.
