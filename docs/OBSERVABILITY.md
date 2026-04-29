# Observability

Tifa Assistant Framework should expose metrics, structured logs, traces, and audit events. TradeVibe currently has a local health endpoint and process logs; SaaS mode should add durable telemetry.

## Health Status

Health checks use:

- `ok`
- `degraded`
- `disabled`
- `down`

Disabled optional SaaS checks should not fail local readiness.

## Metrics

Target metrics:

- `chat_requests_total`
- `chat_stream_failures_total`
- `llm_provider_latency_ms`
- `tts_queue_depth`
- `tts_cache_hit_ratio`
- `tool_calls_total`
- `text_to_sql_rejections_total`
- `usage_events_total`
- `tenant_rate_limited_total`

Additional useful metrics:

- `voice_jobs_total`
- `voice_job_failures_total`
- `data_connector_query_latency_ms`
- `data_connector_rejections_total`
- `provider_fallbacks_total`
- `tenant_budget_limited_total`

## Logs

Structured logs should include:

- Request ID.
- Tenant ID when available.
- Assistant ID when available.
- Session ID when available.
- Provider/model for model calls.
- Tool name and status for tool calls.
- Voice provider/job status for TTS.
- Rejection reason for guardrails and policies.

Do not log raw secrets or provider API keys.

## Audit Events

Audit events should capture:

- Admin policy changes.
- API key creation, rotation, and revocation.
- Provider key metadata changes.
- Connector query attempts.
- Text-to-SQL rejections.
- Tool call execution.
- Budget and rate-limit events.

