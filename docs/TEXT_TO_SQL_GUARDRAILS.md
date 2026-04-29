# Text-To-SQL Guardrails

Tifa Assistant Framework should support safe financial database questions without allowing raw natural language to become executable SQL.

## Current State

TradeVibe does not currently execute Text-to-SQL. The current assistant uses local chat routes and local runtime artifacts. Any Text-to-SQL feature must be added as an opt-in, guarded scaffold.

## Target Pipeline

```text
User question
  -> Intent classification
  -> Schema and semantic context retrieval
  -> QueryPlan JSON
  -> SQL compiler
  -> Static SQL validation
  -> Read-only connector execution
  -> Summary with citations/evidence
  -> Tool call, usage, and audit events
```

## QueryPlan Shape

The intermediate plan should include:

- `intent`
- `entities`
- `timeframe`
- `metrics`
- `dimensions`
- `filters`
- `allowedViews`
- `limit`
- `explanation`

The QueryPlan is the only input to the SQL compiler. The raw user question should never be concatenated into SQL.

The initial scaffold lives under:

```text
lib/text-to-sql/types.ts
lib/text-to-sql/planner.ts
lib/text-to-sql/semantic-layer.ts
lib/text-to-sql/sql-validator.ts
lib/text-to-sql/guardrails.ts
```

The scaffold intentionally uses a conservative QueryPlan compiler and connector safety validation. It is not a production financial analyst yet; it is a guarded path for future integrations.

## Static Validation Rules

The validator should reject queries that:

- Are not `SELECT` statements.
- Contain multiple statements.
- Contain risky comments.
- Reference disallowed tables or views.
- Omit a limit.
- Exceed configured row limits.
- Use write functions or unsafe commands.
- Contain `INSERT`, `UPDATE`, `DELETE`, `CREATE`, `DROP`, `ALTER`, `TRUNCATE`, `GRANT`, `REVOKE`, `COPY`, or `CALL`.
- Query outside the maximum allowed date window when a date window policy is configured.

## Allowed Financial Views

Default examples:

- `v_market_bars`
- `v_latest_news`
- `v_symbol_daily_stats`
- `v_macro_calendar`
- `v_sentiment_rollup`

The allowlist is configured by `TIFA_PG_ALLOWED_VIEWS`.

## Default Feature Flag

Text-to-SQL execution should be disabled unless:

```env
TIFA_TEXT_TO_SQL_ENABLED=1
```

Planning and validation can be developed independently, but connector execution should remain opt-in.

## Evidence Requirements

Answers derived from financial databases should include:

- Source view names.
- Time window.
- Symbols/entities used.
- Row counts.
- Query warnings.
- A statement that results are informational and not investment advice when applicable.

## Audit Requirements

Every Text-to-SQL attempt should produce audit/tool-call records with:

- Tenant and assistant context.
- Original intent classification.
- QueryPlan JSON.
- Compiled SQL after guardrails.
- Rejection reasons, if rejected.
- Connector source and row count, if executed.
- Usage event metadata for planning, validation, and query execution.
