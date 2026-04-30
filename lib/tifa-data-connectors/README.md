# tifa-data-connectors

Data connector boundary for safe financial data access:

- connector contracts
- PostgreSQL financial connector scaffold
- SQL safety validation
- financial semantic views
- guarded Text-to-SQL planning scaffold

All connector execution remains opt-in. Local Tifa mode does not require a database.

## Public Import

```ts
import {
  createPostgresFinancialConnector,
  validateReadOnlySql,
  createQueryPlan,
  validateQueryPlanSql,
  type DataConnector,
  type QueryPlan,
} from "@/lib/tifa-data-connectors";
```

## Owns

- Data connector contracts.
- Optional PostgreSQL connector and `pg` client wiring.
- SQL safety validation and allowlisted view enforcement.
- Deterministic Text-to-SQL planning and QueryPlan-to-SQL compilation.
- Financial and Fx-Sentinel semantic view definitions.

## Does Not Own

- Raw natural-language-to-SQL execution.
- Database credential management.
- Applying migrations automatically.
- SaaS billing or audit sink persistence.

## Extraction Notes

This package should remain disabled by default. Consuming repositories should
start with `execute=false` planning and only enable execution after applying
reviewed semantic views and read-only database grants.
