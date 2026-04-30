# PostgreSQL Financial Connector

The PostgreSQL financial connector is a scaffold for safe financial data access in Tifa Assistant Framework. It is disabled by default and does not require a live database for Tifa smoke tests.

## Environment

```env
TIFA_PG_ENABLED=0
TIFA_PG_CONNECTION_STRING=
TIFA_PG_STATEMENT_TIMEOUT_MS=4000
TIFA_PG_MAX_ROWS=500
TIFA_PG_ALLOWED_VIEWS=v_market_bars,v_latest_news,v_symbol_daily_stats,v_macro_calendar,v_sentiment_rollup,v_fx_market_snapshots,v_fx_latest_news,v_fx_symbol_daily_stats,v_fx_macro_calendar,v_fx_sentiment_rollup
TIFA_PG_POOL_MAX=4
TIFA_PG_CONNECT_TIMEOUT_MS=3000
TIFA_PG_IDLE_TIMEOUT_MS=30000
TIFA_PG_SSL=0
```

The live driver uses the `pg` package only when `TIFA_PG_ENABLED=1` and a
connection string is configured. Local-first mode keeps the connector disabled
and does not require PostgreSQL.

## Safety Rules

The connector must enforce:

- Read-only only.
- `SELECT` only.
- Block `INSERT`, `UPDATE`, `DELETE`, `CREATE`, `DROP`, `ALTER`, `TRUNCATE`, and related unsafe commands.
- Block multiple statements.
- Block risky comments.
- Enforce `LIMIT` when missing.
- Cap requested limits to `TIFA_PG_MAX_ROWS`.
- Enforce statement timeout when a live driver is wired.
- Allowlist views only.
- Require tenant context when SaaS mode is enabled.
- Audit every query attempt, including rejected attempts.

## Normalized Result

Connector query results normalize to:

```ts
{
  columns: string[];
  rows: Array<Record<string, unknown>>;
  rowCount: number;
  latencyMs: number;
  source: string;
  warnings: string[];
}
```

## Default Financial Views

- `v_market_bars`
- `v_latest_news`
- `v_symbol_daily_stats`
- `v_macro_calendar`
- `v_sentiment_rollup`
- `v_fx_market_snapshots`
- `v_fx_latest_news`
- `v_fx_symbol_daily_stats`
- `v_fx_macro_calendar`
- `v_fx_sentiment_rollup`

The `v_fx_*` views are the Fx-Sentinel semantic adapter. The framework includes
the manual SQL draft in `sql/fx_sentinel_text_to_sql_views.sql`; apply it to the
Fx-Sentinel database before enabling live execution against those view names.

## Live Driver Behavior

When enabled, the connector:

- Opens a small PostgreSQL pool lazily.
- Runs each query inside `BEGIN READ ONLY`.
- Applies `SET LOCAL statement_timeout` from `TIFA_PG_STATEMENT_TIMEOUT_MS`.
- Executes only SQL compiled from a `QueryPlan` and accepted by
  `validateReadOnlySql()`.
- Caps result rows to `TIFA_PG_MAX_ROWS`.
- Reports health as `ok` only after `SELECT 1 AS ok` succeeds.

## Current Limitation

The connector still expects externally managed database credentials, network
access, and read-only grants. Audit events are represented in the connector
contracts but are not yet persisted to a SaaS audit sink.
