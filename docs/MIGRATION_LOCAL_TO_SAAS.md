# Migration From Local Tifa To SaaS Runtime

This is a staged migration plan. It is not an instruction to turn the current local Tifa deployment into SaaS in one release.

## Stage 1: Keep Local Mode As Baseline

- Keep filesystem runtime enabled.
- Keep `TIFA_API_URL` and local Ollama-compatible chat.
- Keep Piper voice jobs and cache.
- Keep current TifaWidget widget behavior.
- Add framework contracts and docs only.

## Stage 2: Add Adapter Interfaces

- Add persistence adapters for sessions and messages.
- Add voice asset storage abstraction.
- Add provider gateway adapters.
- Add usage and audit event sinks.
- Keep local adapter as the default.

## Stage 3: Introduce PostgreSQL In Hybrid Mode

- Apply schema in a non-production environment.
- Backfill selected local chat sessions if needed.
- Run dual-write or shadow-write for sessions/messages.
- Compare filesystem and database records.
- Keep rollback to local mode available.

## Stage 4: Add Redis And Queue Coordination

- Move rate limits out of process memory.
- Coordinate voice jobs across workers.
- Add idempotency keys for request replay safety.
- Keep optional dependencies disabled in local mode.

## Stage 5: Add Object Storage

- Store generated audio in object storage.
- Keep local cache as a development optimization.
- Add signed URL access.
- Add lifecycle retention policies.

## Stage 6: Add Auth, Tenant Policies, And Metering

- Wire an auth provider.
- Enforce tenant context on every request.
- Emit usage events.
- Add rate and budget limits.
- Add admin audit review.

## Rollback Principle

Every SaaS adapter should be behind configuration. If a SaaS dependency is disabled or unavailable, local Tifa should still run with the current filesystem behavior unless explicitly started in strict SaaS mode.

