import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { jsonError, parseTimeoutMs } from "@/lib/api";
import {
  checkRateLimit,
  getClientIp,
  parsePositiveInt,
} from "@/lib/rate-limit";

const TIFA_TIMEOUT_MS = parseTimeoutMs(process.env.TIFA_TIMEOUT_MS, 20000);
const MAX_MESSAGE_LENGTH = 2000;
const PROMPT_PATH = process.env.TIFA_PROMPT_PATH || "prompts/TIFA_RUNTIME.md";
const DEFAULT_PROMPT = "You are Tifa — a warm, encouraging AI trading companion. Respond naturally and motivate the user like a supportive partner.";

const RATE_LIMIT_WINDOW_MS = parsePositiveInt(
  process.env.TIFA_RATE_LIMIT_WINDOW_MS,
  60000
);
const RATE_LIMIT_MAX = parsePositiveInt(process.env.TIFA_RATE_LIMIT_MAX, 20);

async function getTifaPrompt() {
  try {
    const fullPath = path.resolve(process.cwd(), PROMPT_PATH);
    return await fs.readFile(fullPath, "utf-8");
  } catch {
    console.warn(`Could not read Tifa prompt from ${PROMPT_PATH}, using default.`);
    return DEFAULT_PROMPT;
  }
}

export async function POST(req: Request) {
  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return jsonError("VALIDATION_ERROR", "Invalid JSON in request body.", 400);
    }

    const message = (body.message || "").toString().trim();

    if (!message) {
      return jsonError("VALIDATION_ERROR", "Message cannot be empty.", 400);
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return jsonError(
        "PAYLOAD_TOO_LARGE",
        `Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters.`,
        413
      );
    }

    const clientIp = getClientIp(req);
    const rateLimitResult = checkRateLimit({
      key: `tifa:${clientIp}`,
      limit: RATE_LIMIT_MAX,
      windowMs: RATE_LIMIT_WINDOW_MS,
    });

    if (!rateLimitResult.allowed) {
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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIFA_TIMEOUT_MS);

    // ... rest of the function
    try {
      const tifaPrompt = await getTifaPrompt();
      const finalPrompt = `${tifaPrompt}\nUser message: ${message}`;

      const res = await fetch(process.env.TIFA_API_URL!, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: process.env.TIFA_MODEL,
          prompt: finalPrompt,
          stream: false,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorText = await res.text();
        return jsonError("UPSTREAM_AI_ERROR", "The AI service failed to respond.", 502, {
          details: { status: res.status, statusText: res.statusText, body: errorText },
          retryable: true,
        });
      }

      const json = await res.json();
      const reply = json.response || "I'm here, but I couldn't think of a reply. Let’s talk markets 💬";

      return NextResponse.json({ reply, model: process.env.TIFA_MODEL });

    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === 'AbortError') {
        return jsonError("AI_TIMEOUT", "The AI service took too long to respond.", 504, { retryable: true });
      }
      return jsonError("INTERNAL_ERROR", "An unexpected error occurred while contacting the AI service.", 500, {
        details: err instanceof Error ? err.message : String(err),
      });
    }
  } catch (err: unknown) {
    return jsonError("INTERNAL_ERROR", "An unexpected server error occurred.", 500, {
      details: err instanceof Error ? err.message : String(err),
    });
  }
}
