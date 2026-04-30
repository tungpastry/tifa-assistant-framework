# Text-to-SQL MVP

The Text-to-SQL API is experimental and disabled for execution by default. It is
intended to prove the guarded planning pipeline before any production financial
database is attached.

## Endpoints

### `POST /api/data/query-plan`

Plans and validates a question without executing SQL.

```json
{
  "question": "Show EUR/USD price snapshot",
  "allowedViews": ["v_fx_market_snapshots"],
  "maxRows": 100
}
```

Response:

```json
{
  "plan": {},
  "validation": {},
  "enabled": false,
  "experimental": true
}
```

### `POST /api/data/query`

Builds a deterministic query plan and only executes if all required feature
flags are enabled and the request opts in with `execute: true`.

```json
{
  "question": "Show EUR/USD price snapshot",
  "allowedViews": ["v_fx_market_snapshots"],
  "maxRows": 100,
  "execute": true
}
```

## Local Disabled Behavior

Default local mode has:

```env
TIFA_TEXT_TO_SQL_ENABLED=0
TIFA_PG_ENABLED=0
```

With these defaults, `/api/data/query` returns a controlled JSON response with
the plan, validation result, `data: null`, and a summary explaining that
execution is disabled. It does not fail local smoke tests and does not require a
database.

## Enabled Behavior

Execution requires both:

```env
TIFA_TEXT_TO_SQL_ENABLED=1
TIFA_PG_ENABLED=1
TIFA_PG_CONNECTION_STRING=postgres://...
TIFA_PG_ALLOWED_VIEWS=v_fx_market_snapshots,v_fx_latest_news,v_fx_symbol_daily_stats,v_fx_macro_calendar,v_fx_sentiment_rollup
```

The PostgreSQL connector is wired through the optional `pg` driver. It is still
opt-in and only executes SQL compiled from a deterministic `QueryPlan`, then
accepted by static guardrails.

## Fx-Sentinel Semantic Views

Apply `sql/fx_sentinel_text_to_sql_views.sql` to the Fx-Sentinel PostgreSQL
database before enabling execution. It exposes read-only views for:

- `v_fx_market_snapshots`
- `v_fx_latest_news`
- `v_fx_symbol_daily_stats`
- `v_fx_macro_calendar`
- `v_fx_sentiment_rollup`

The deterministic planner maps price/OHLC questions to market snapshots, news
questions to latest report drivers, sentiment questions to report sentiment, and
macro/calendar questions to upcoming report events.

## Safety Model

- Raw user SQL is never accepted.
- Natural language is classified into a deterministic `QueryPlan`.
- SQL is compiled from the `QueryPlan`.
- `validateReadOnlySql()` enforces read-only `SELECT` statements.
- Multiple statements, comments, write keywords, unsafe functions, and
  disallowed relations are rejected.
- Allowlisted views and row limits are enforced.
- SaaS mode can require tenant context before execution.

## Future Fx-Sentinel Usage

Fx-Sentinel can point Tifa at its PostgreSQL database with the `v_fx_*` view
allowlist. Do not grant access to raw tables unless a future migration explicitly
adds reviewed semantic views and tests.
