import { validateReadOnlySql } from "@/lib/data-connectors/safety";
import type { QueryPlan, TextToSqlValidationResult } from "./types";

export function compileQueryPlanToSql(plan: QueryPlan): string {
  const view = plan.allowedViews[0];
  if (!view) {
    return "";
  }

  const selectColumns = [...new Set([...plan.dimensions, ...plan.metrics])];
  const columns = selectColumns.length > 0 ? selectColumns.join(", ") : "*";
  const whereParts = plan.filters.map((filter) => {
    if (filter.operator === "in" && Array.isArray(filter.value)) {
      const values = filter.value.map((value) => quoteLiteral(value)).join(", ");
      return `${filter.field} IN (${values})`;
    }

    return `${filter.field} ${filter.operator.toUpperCase()} ${quoteLiteral(filter.value)}`;
  });
  const whereClause = whereParts.length > 0 ? ` WHERE ${whereParts.join(" AND ")}` : "";

  return `SELECT ${columns} FROM ${view}${whereClause} LIMIT ${plan.limit}`;
}

export function validateQueryPlanSql(plan: QueryPlan, options: {
  maxRows: number;
  tenantId?: string;
  requireTenantContext?: boolean;
}): TextToSqlValidationResult {
  const sql = compileQueryPlanToSql(plan);

  if (!sql) {
    return {
      allowed: false,
      reasons: ["QueryPlan does not include an allowed view."],
      warnings: [],
      plan,
    };
  }

  const result = validateReadOnlySql(sql, {
    allowedViews: plan.allowedViews,
    maxRows: options.maxRows,
    tenantId: options.tenantId,
    requireTenantContext: options.requireTenantContext,
  });

  return {
    allowed: result.allowed,
    sql: result.sql,
    reasons: result.reasons,
    warnings: result.warnings,
    plan,
  };
}

function quoteLiteral(value: unknown): string {
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  return `'${String(value).replaceAll("'", "''")}'`;
}

