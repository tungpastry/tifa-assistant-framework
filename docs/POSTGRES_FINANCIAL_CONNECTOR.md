# PostgreSQL Financial Connector

The PostgreSQL financial connector is a scaffold for safe financial data access in Tifa Assistant Framework. It is disabled by default and does not require a live database for TradeVibe smoke tests.

## Environment

```env
TIFA_PG_ENABLED=0
TIFA_PG_CONNECTION_STRING=
TIFA_PG_STATEMENT_TIMEOUT_MS=4000
TIFA_PG_MAX_ROWS=500
TIFA_PG_ALLOWED_VIEWS=v_market_bars,v_latest_news,v_symbol_daily_stats,v_macro_calendar,v_sentiment_rollup
```

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

## Current Limitation

This phase does not install a PostgreSQL driver or require a database connection. A live SaaS deployment should inject a driver-backed query client that sets transaction read-only mode, applies `statement_timeout`, and records audit events.

