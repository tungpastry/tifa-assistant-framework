# Text-to-SQL MVP

The Text-to-SQL API is experimental and disabled for execution by default. It is
intended to prove the guarded planning pipeline before any production financial
database is attached.

## Endpoints

### `POST /api/data/query-plan`

Plans and validates a question without executing SQL.

```json
{
  "question": "Show AAPL price and volume",
  "allowedViews": ["v_market_bars"],
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
  "question": "Show AAPL price and volume",
  "allowedViews": ["v_market_bars"],
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
```

The current PostgreSQL connector remains scaffolded and must be wired with a
safe client before production use. Queries are executed only through the data
connector after static validation.

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

Fx-Sentinel can provide a real PostgreSQL financial schema and semantic layer
for market bars, news, macro events, sentiment, and symbol statistics while
keeping this framework endpoint contract unchanged.
