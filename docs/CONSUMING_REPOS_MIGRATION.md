# Consuming Repositories Migration Guide

This guide describes how other repositories should adopt Tifa Assistant
Framework modules without copying the full reference app.

## General Rules

- Start with local-first defaults.
- Import from `@/lib/tifa-*` boundaries, not deep implementation paths.
- Keep framework runtime data out of Git.
- Enable cloud providers, PostgreSQL, Redis, object storage, and SaaS mode only
  after explicit environment review.
- Validate chat, streaming, voice jobs, and health before enabling new tools.

## TradeVibe

Purpose: reference product app consuming Tifa as a floating assistant.

Recommended modules:

- `tifa-widget` for hooks/client helpers.
- `tifa-provider-gateway` for provider routing.
- `tifa-voice` for voice jobs if local TTS remains desired.

Migration path:

1. Keep the product dashboard in TradeVibe.
2. Replace copied widget logic with `tifa-widget` hooks.
3. Route chat through Tifa provider gateway contracts.
4. Keep product-specific prompts and assets in TradeVibe.

## Fx-Sentinel

Purpose: financial PostgreSQL and guarded Text-to-SQL reference integration.

Recommended modules:

- `tifa-data-connectors`
- `tifa-provider-gateway`
- `tifa-widget`

Migration path:

1. Apply reviewed semantic views from `sql/fx_sentinel_text_to_sql_views.sql`.
2. Configure `TIFA_PG_ALLOWED_VIEWS` with only `v_fx_*` views.
3. Test `/api/data/query-plan` with `execute=false`.
4. Enable `TIFA_TEXT_TO_SQL_ENABLED=1` and `TIFA_PG_ENABLED=1` only in staging.
5. Grant read-only database access to semantic views only.

## ZenoraAI

Purpose: 2D assistant/persona integration.

Recommended modules:

- `tifa-widget` for chat/voice hooks and extension points.
- `tifa-provider-gateway` for model routing.
- `tifa-core` for assistant/persona contracts.

Migration path:

1. Keep ZenoraAI avatar rendering in its own UI layer.
2. Use `tifa-widget` hooks instead of copying TifaWidget presentation.
3. Use extension points for provider badges, voice controls, and message rendering.
4. Keep persona prompt assets outside the core framework package.

## nexuscrypto

Purpose: crypto dashboard assistant and connector reference.

Recommended modules:

- `tifa-data-connectors`
- `tifa-provider-gateway`
- `tifa-widget`

Migration path:

1. Add crypto semantic views as a separate allowlist.
2. Keep raw exchange tables inaccessible to Text-to-SQL.
3. Extend QueryPlan metrics/dimensions only through reviewed semantic mappings.
4. Validate disabled-mode query planning before live execution.

## nexus-trade-radar

Purpose: market dashboard and realtime signal assistant.

Recommended modules:

- `tifa-widget`
- `tifa-provider-gateway`
- `tifa-runtime`
- `tifa-data-connectors`

Migration path:

1. Reuse widget hooks for dashboard chat.
2. Keep realtime signal ingestion in the product repository.
3. Expose read-only signal summary views for data connector usage.
4. Add citations/evidence from connector results before enabling user-facing tool calls.

## Compatibility Checklist

Before switching a consuming repo to Tifa modules:

- `POST /api/tifa` works.
- `POST /api/tifa/stream` works.
- `POST /api/voice/jobs` works or voice is intentionally disabled.
- `/api/health` reports local dependencies clearly.
- Optional SaaS/data providers are disabled unless intentionally configured.
- No `.env` secrets or generated runtime files are committed.
