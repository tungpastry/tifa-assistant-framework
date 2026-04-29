import { randomUUID } from "crypto";
import type { ErrorEnvelope } from "./types";

export type FrameworkErrorCode =
  | "TENANT_REQUIRED"
  | "TENANT_SUSPENDED"
  | "ASSISTANT_NOT_FOUND"
  | "POLICY_REJECTED"
  | "PROVIDER_UNAVAILABLE"
  | "TOOL_REJECTED"
  | "TEXT_TO_SQL_DISABLED"
  | "TEXT_TO_SQL_REJECTED"
  | "CONNECTOR_DISABLED"
  | "CONNECTOR_QUERY_REJECTED"
  | "VOICE_PROVIDER_DISABLED"
  | "RATE_LIMITED"
  | "BUDGET_EXCEEDED"
  | "INTERNAL_ERROR";

export class FrameworkError extends Error {
  code: FrameworkErrorCode;
  requestId: string;
  retryable: boolean;
  details?: Record<string, unknown>;

  constructor(
    code: FrameworkErrorCode,
    message: string,
    options?: {
      requestId?: string;
      retryable?: boolean;
      details?: Record<string, unknown>;
    }
  ) {
    super(message);
    this.name = "FrameworkError";
    this.code = code;
    this.requestId = options?.requestId ?? randomUUID();
    this.retryable = options?.retryable ?? false;
    this.details = options?.details;
  }
}

export function createErrorEnvelope(
  code: FrameworkErrorCode,
  message: string,
  options?: {
    requestId?: string;
    retryable?: boolean;
    details?: Record<string, unknown>;
  }
): ErrorEnvelope {
  return {
    code,
    message,
    requestId: options?.requestId ?? randomUUID(),
    retryable: options?.retryable ?? false,
    details: options?.details,
  };
}

export function toErrorEnvelope(error: unknown): ErrorEnvelope {
  if (error instanceof FrameworkError) {
    return createErrorEnvelope(error.code, error.message, {
      requestId: error.requestId,
      retryable: error.retryable,
      details: error.details,
    });
  }

  return createErrorEnvelope("INTERNAL_ERROR", "An unexpected framework error occurred.", {
    details: error instanceof Error ? { message: error.message } : undefined,
  });
}

