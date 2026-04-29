import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { jsonError, parseTimeoutMs } from "@/lib/api";
import {
  checkRateLimit,
  getClientIp,
  parsePositiveInt,
} from "@/lib/rate-limit";

export const MAX_TIFA_MESSAGE_LENGTH = 2000;
export const DEFAULT_TIFA_MODEL = "gemma3:1b";
export const DEFAULT_TIFA_PROMPT =
  "You are Tifa — a warm, encouraging AI trading companion. Respond naturally and motivate the user like a supportive partner.";

export interface TifaRuntimeConfig {
  model: string;
  apiUrl: string;
  timeoutMs: number;
  promptPath: string;
  rateLimitWindowMs: number;
  rateLimitMax: number;
}

export interface TifaRequestBody {
  message: string;
  mood?: string;
}

export type TifaRequestParseResult =
  | { ok: true; body: TifaRequestBody }
  | { ok: false; response: NextResponse };

export function getTifaRuntimeConfig(): TifaRuntimeConfig {
  return {
    model: process.env.TIFA_MODEL || DEFAULT_TIFA_MODEL,
    apiUrl: process.env.TIFA_API_URL || "",
    timeoutMs: parseTimeoutMs(process.env.TIFA_TIMEOUT_MS, 20000),
    promptPath: process.env.TIFA_PROMPT_PATH || "prompts/TIFA_RUNTIME.md",
    rateLimitWindowMs: parsePositiveInt(
      process.env.TIFA_RATE_LIMIT_WINDOW_MS,
      60000
    ),
    rateLimitMax: parsePositiveInt(process.env.TIFA_RATE_LIMIT_MAX, 20),
  };
}

export async function readTifaPrompt(promptPath: string): Promise<string> {
  try {
    const fullPath = path.resolve(process.cwd(), promptPath);
    return await fs.readFile(fullPath, "utf-8");
  } catch {
    console.warn(`Could not read Tifa prompt from ${promptPath}, using default.`);
    return DEFAULT_TIFA_PROMPT;
  }
}

export function buildTifaPrompt(
  prompt: string,
  message: string,
  mood?: string
): string {
  void mood;
  return `${prompt}\nUser message: ${message}`;
}

export async function parseTifaRequestBody(
  req: Request
): Promise<TifaRequestParseResult> {
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
  const message = (body.message || "").toString().trim();
  const mood = typeof body.mood === "string" ? body.mood.trim() : undefined;

  if (!message) {
    return {
      ok: false,
      response: jsonError("VALIDATION_ERROR", "Message cannot be empty.", 400),
    };
  }

  if (message.length > MAX_TIFA_MESSAGE_LENGTH) {
    return {
      ok: false,
      response: jsonError(
        "PAYLOAD_TOO_LARGE",
        `Message exceeds maximum length of ${MAX_TIFA_MESSAGE_LENGTH} characters.`,
        413
      ),
    };
  }

  return {
    ok: true,
    body: {
      message,
      ...(mood ? { mood } : {}),
    },
  };
}

export function checkTifaRateLimit(
  req: Request,
  config: TifaRuntimeConfig
): NextResponse | null {
  const clientIp = getClientIp(req);
  const rateLimitResult = checkRateLimit({
    key: `tifa:${clientIp}`,
    limit: config.rateLimitMax,
    windowMs: config.rateLimitWindowMs,
  });

  if (rateLimitResult.allowed) {
    return null;
  }

  return jsonError(
    "RATE_LIMITED",
    "Too many Tifa requests. Please slow down.",
    429,
    {
      retryable: true,
      publicDetails: { retry_after_seconds: rateLimitResult.retryAfterSeconds },
    }
  );
}

export function createAbortController(timeoutMs: number) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  return {
    controller,
    clear: () => clearTimeout(timeoutId),
  };
}
