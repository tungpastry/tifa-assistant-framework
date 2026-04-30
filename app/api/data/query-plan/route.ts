import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { getFrameworkRuntimeConfig } from "@/lib/framework/config";
import { planAndValidateTextToSql } from "@/lib/text-to-sql/guardrails";
import type { TextToSqlRequest } from "@/lib/text-to-sql/types";

export const runtime = "nodejs";

const MAX_QUESTION_LENGTH = 2000;

interface ParsedDataQueryRequest {
  question: string;
  allowedViews?: string[];
  maxRows: number;
}

async function parseDataQueryRequest(req: Request): Promise<
  | { ok: true; body: ParsedDataQueryRequest }
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
  const validation = planAndValidateTextToSql(textToSqlRequest);

  return NextResponse.json({
    plan: validation.plan,
    validation,
    enabled: frameworkConfig.textToSqlEnabled,
    experimental: true,
  });
}
