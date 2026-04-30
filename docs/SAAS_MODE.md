# SaaS Mode Scaffold

Tifa Assistant Framework has optional SaaS scaffolds, but local Tifa reference mode remains the default. Do not enable SaaS mode unless the required services are intentionally wired.

## Feature Flags

```env
TIFA_RUNTIME_MODE=local
TIFA_SAAS_MODE=0
TIFA_LOCAL_FIRST=1
TIFA_DEFAULT_TENANT_ID=local
TIFA_DEFAULT_ASSISTANT_ID=tifa-assistant
TIFA_DEFAULT_LOCALE=en-US

TIFA_PG_ENABLED=0
TIFA_REDIS_ENABLED=0
TIFA_OBJECT_STORAGE_ENABLED=0
TIFA_TEXT_TO_SQL_ENABLED=0
TIFA_VIENEU_ENABLED=0
```

These defaults keep the framework in local-first mode. They do not require
PostgreSQL, Redis, object storage, auth, or external provider keys.

## Scaffolded Components

| Component | Current state |
| --- | --- |
| PostgreSQL sessions/messages | `PostgresSessionAdapter` scaffold, disabled unless `TIFA_SAAS_MODE=1` and `TIFA_PG_ENABLED=1` |
| Redis rate limiter | `RedisRateLimiterScaffold`, no Redis dependency yet |
| Object storage voice assets | `ObjectStorageVoiceAssetScaffold`, no storage dependency yet |
| Audit events | `AuditEventWriter` interface plus no-op writer |
| Usage events | `UsageEventWriter` interface plus no-op writer |
| Tenant context | Header-based resolver scaffold for future middleware |
| RLS | Draft SQL in `sql/tifa_saas_rls_draft.sql` |

## Health

`/api/health` reports disabled optional SaaS checks without failing local readiness. If a SaaS flag is enabled before its client is wired, the related check may report `degraded`.

## Local Compatibility

Local mode still uses:

- filesystem runtime
- local TifaWidget sessions
- local TTS jobs
- local Piper audio cache
- in-memory rate limits
- existing `/api/*` contracts
