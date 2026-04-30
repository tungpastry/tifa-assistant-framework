import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { createDefaultDataConnectorRegistry } from "@/lib/data-connectors/registry";
import { getFrameworkRuntimeConfig } from "@/lib/framework/config";
import { createQueryPlan } from "@/lib/text-to-sql/planner";
import { validateQueryPlanSql } from "@/lib/text-to-sql/sql-validator";
import type { TextToSqlRequest } from "@/lib/text-to-sql/types";

export const runtime = "nodejs";

const MAX_QUESTION_LENGTH = 2000;

async function parseDataQueryRequest(req: Request): Promise<
  | {
      ok: true;
      body: {
        question: string;
        allowedViews?: string[];
        maxRows: number;
        execute: boolean;
      };
    }
  | { ok: false; response: NextResponse }
> {
  let rawBody: unknown;

  try {
    rawBody = await req.json();
  } catch {
    return {
      ok: false,
      response: jsonError("VALIDATION_ERROR", "Invalid JSON in request body.", 400),
    };
  }

  const body = rawBody && typeof rawBody === "object"
    ? (rawBody as Record<string, unknown>)
    : {};
  const question = typeof body.question === "string" ? body.question.trim() : "";

  if (!question) {
    return {
      ok: false,
      response: jsonError("VALIDATION_ERROR", "Question cannot be empty.", 400),
    };
  }

  if (question.length > MAX_QUESTION_LENGTH) {
    return {
      ok: false,
      response: jsonError(
        "PAYLOAD_TOO_LARGE",
        `Question exceeds maximum length of ${MAX_QUESTION_LENGTH} characters.`,
        413
      ),
    };
  }

  const allowedViews = Array.isArray(body.allowedViews)
    ? body.allowedViews.filter((view): view is string => typeof view === "string" && view.trim().length > 0)
    : undefined;
  const requestedRows = typeof body.maxRows === "number" && Number.isFinite(body.maxRows)
    ? Math.floor(body.maxRows)
    : 100;

  return {
    ok: true,
    body: {
      question,
      ...(allowedViews ? { allowedViews } : {}),
      maxRows: Math.max(1, Math.min(requestedRows, 500)),
      execute: body.execute === true,
    },
  };
}

export async function POST(req: Request) {
  const parsed = await parseDataQueryRequest(req);
  if (!parsed.ok) return parsed.response;

  const frameworkConfig = getFrameworkRuntimeConfig();
  const textToSqlRequest: TextToSqlRequest = {
    question: parsed.body.question,
    allowedViews: parsed.body.allowedViews,
    maxRows: parsed.body.maxRows,
    context: {
      tenantId: frameworkConfig.defaultTenantId,
      assistantId: frameworkConfig.defaultAssistantId,
      saasMode: frameworkConfig.mode === "saas",
    },
  };
  const plan = createQueryPlan(textToSqlRequest);
  const validation = validateQueryPlanSql(plan, {
    maxRows: parsed.body.maxRows,
    tenantId: textToSqlRequest.context.tenantId,
    requireTenantContext: textToSqlRequest.context.saasMode,
  });

  if (!frameworkConfig.textToSqlEnabled || !frameworkConfig.postgresEnabled || !parsed.body.execute) {
    return NextResponse.json({
      plan,
      validation: {
        ...validation,
        allowed: false,
        reasons: [
          ...validation.reasons,
          ...(!frameworkConfig.textToSqlEnabled ? ["Text-to-SQL execution is disabled."] : []),
          ...(!frameworkConfig.postgresEnabled ? ["PostgreSQL execution is disabled."] : []),
          ...(!parsed.body.execute ? ["Request did not opt in to execution."] : []),
        ],
      },
      sql: validation.sql ?? null,
      data: null,
      evidence: [],
      summary: "Guarded query planning completed, but execution is disabled for this local runtime.",
      enabled: false,
      experimental: true,
    });
  }

  if (!validation.allowed || !validation.sql) {
    return NextResponse.json(
      {
        plan,
        validation,
        sql: validation.sql ?? null,
        data: null,
        evidence: [],
        summary: "Guardrails rejected this query plan.",
        enabled: true,
        experimental: true,
      },
      { status: 400 }
    );
  }

  const connector = createDefaultDataConnectorRegistry().get("postgres-financial");
  if (!connector) {
    return jsonError("INTERNAL_ERROR", "PostgreSQL connector is not registered.", 500);
  }

  try {
    const data = await connector.query({
      sql: validation.sql,
      context: textToSqlRequest.context,
      maxRows: parsed.body.maxRows,
      allowedViews: plan.allowedViews,
    });

    return NextResponse.json({
      plan,
      sql: validation.sql,
      data,
      evidence: [
        {
          source: data.source,
          rowCount: data.rowCount,
          columns: data.columns,
        },
      ],
      summary: `Returned ${data.rowCount} row(s) from ${data.source}.`,
      experimental: true,
    });
  } catch (err) {
    return jsonError("INTERNAL_ERROR", "Guarded query execution failed.", 500, {
      details: err instanceof Error ? err.message : String(err),
      retryable: true,
    });
  }
}
