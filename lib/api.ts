import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import fs from "fs/promises";

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "PAYLOAD_TOO_LARGE"
  | "UPSTREAM_AI_ERROR"
  | "AI_TIMEOUT"
  | "TTS_TIMEOUT"
  | "TTS_GENERATION_FAILED"
  | "HEALTH_CHECK_FAILED"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

export interface JsonErrorOptions {
  details?: unknown;        // server log only
  retryable?: boolean;
  publicDetails?: unknown;  // client-safe details
}

/**
 * Creates a unique request ID.
 */
export function createRequestId() {
  return randomUUID();
}

/**
 * Creates a standardized JSON error response.
 */
export function jsonError(
  code: ErrorCode,
  message: string,
  status: number,
  options: JsonErrorOptions = {}
) {
  const requestId = createRequestId();
  console.error(`[${status}] ${code}: ${message}`, {
    requestId,
    details: options.details,
    publicDetails: options.publicDetails,
  });

  return NextResponse.json(
    {
      error: {
        code,
        message,
        request_id: requestId,
        retryable: options.retryable ?? false,
        ...(options.publicDetails ? { details: options.publicDetails } : {}),
      },
    },
    { status }
  );
}

/**
 * Parses a timeout value from an environment variable, with a fallback.
 */
export function parseTimeoutMs(value: string | undefined, fallbackMs: number): number {
  if (!value) {
    return fallbackMs;
  }
  const parsed = parseInt(value, 10);
  return isNaN(parsed) || parsed <= 0 ? fallbackMs : parsed;
}

/**
 * Safely deletes a file, ignoring "file not found" errors.
 */
export async function safeUnlink(filePath: string) {
  try {
    await fs.unlink(filePath);
  } catch (err: unknown) {
    if (err instanceof Error && 'code' in err && err.code !== 'ENOENT') {
      console.error(`Failed to delete temp file: ${filePath}`, err);
    }
  }
}
