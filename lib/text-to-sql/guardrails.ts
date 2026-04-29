import type { DataConnector } from "@/lib/data-connectors/types";
import { createQueryPlan } from "./planner";
import { validateQueryPlanSql } from "./sql-validator";
import type { TextToSqlExecutionResult, TextToSqlRequest, TextToSqlValidationResult } from "./types";

export function isTextToSqlEnabled() {
  return process.env.TIFA_TEXT_TO_SQL_ENABLED === "1";
}

export function planAndValidateTextToSql(request: TextToSqlRequest): TextToSqlValidationResult {
  const plan = createQueryPlan(request);

  if (!isTextToSqlEnabled()) {
    return {
      allowed: false,
      reasons: ["Text-to-SQL execution is disabled. Set TIFA_TEXT_TO_SQL_ENABLED=1 to enable guarded execution."],
      warnings: [],
      plan,
    };
  }

  return validateQueryPlanSql(plan, {
    maxRows: request.maxRows ?? 100,
    tenantId: request.context.tenantId,
    requireTenantContext: request.context.saasMode,
  });
}

export async function executeGuardedTextToSql(
  request: TextToSqlRequest,
  connector: DataConnector
): Promise<TextToSqlExecutionResult> {
  const validation = planAndValidateTextToSql(request);

  if (!validation.allowed || !validation.sql) {
    throw new Error(`Text-to-SQL rejected: ${validation.reasons.join(" ")}`);
  }

  const data = await connector.query({
    sql: validation.sql,
    context: request.context,
    maxRows: request.maxRows,
    allowedViews: validation.plan.allowedViews,
  });

  return {
    plan: validation.plan,
    sql: validation.sql,
    data,
    evidence: [
      {
        source: data.source,
        rowCount: data.rowCount,
        columns: data.columns,
      },
    ],
  };
}

