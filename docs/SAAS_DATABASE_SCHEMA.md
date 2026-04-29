# SaaS Database Schema

`sql/tifa_saas_schema.sql` is a tenant-aware schema draft for Tifa Assistant Framework SaaS mode. TradeVibe local mode does not apply or require this schema.

## Tables

The draft includes:

- `tenants`
- `users`
- `tenant_memberships`
- `assistants`
- `assistant_sessions`
- `assistant_messages`
- `connectors`
- `provider_keys`
- `api_keys`
- `tool_calls`
- `model_runs`
- `voice_assets`
- `voice_jobs`
- `usage_events`
- `billing_accounts`
- `audit_events`

## Security Notes

- Tenant-owned tables include `tenant_id`.
- SaaS deployments should enable PostgreSQL Row Level Security.
- Provider keys store `secret_ref` only.
- API keys store `secret_hash` only.
- Raw provider secrets, API keys, and private data must stay in a secret manager or vault.
- Audit events should record policy changes, connector attempts, Text-to-SQL rejections, provider failures, and admin actions.

## Indexing Notes

The draft adds indexes for common access paths:

- Tenant and session lookup.
- Tenant and created-at timelines.
- Usage metering by tenant/meter/time.
- Voice job status polling.
- Tool-call and model-run history.

## Local Compatibility

The existing TradeVibe filesystem runtime remains the default:

- `runtime/chat_sessions/`
- `runtime/tts_jobs/`
- `runtime/audio_cache/`
- `runtime/logs/`

Database persistence should be introduced through adapters behind the framework contracts, not by replacing the local runtime in one step.

