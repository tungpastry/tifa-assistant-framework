// Force the use of Node.js runtime
export const runtime = "nodejs";

import { jsonError, parseTimeoutMs } from "@/lib/api";
import {
  checkRateLimit,
  getClientIp,
  parsePositiveInt,
} from "@/lib/rate-limit";
import fs from "fs/promises";
import path from "path";

// Duplicate constants and helpers from the non-streaming route
const TIFA_TIMEOUT_MS = parseTimeoutMs(process.env.TIFA_TIMEOUT_MS, 20000);
const MAX_MESSAGE_LENGTH = 2000;
const PROMPT_PATH = process.env.TIFA_PROMPT_PATH || "prompts/TIFA_RUNTIME.md";
const DEFAULT_PROMPT = "You are Tifa — a warm, encouraging AI trading companion. Respond naturally and motivate the user like a supportive partner.";

const RATE_LIMIT_WINDOW_MS = parsePositiveInt(process.env.TIFA_RATE_LIMIT_WINDOW_MS, 60000);
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

// SSE encoder
const encoder = new TextEncoder();
function sse(event: string, data: unknown) {
  return encoder.encode(`event: ${event}
data: ${JSON.stringify(data)}

`);
}

export async function POST(req: Request) {
  // --- 1. Validation and Rate Limiting (pre-stream) ---
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
      return jsonError("PAYLOAD_TOO_LARGE", `Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters.`, 413);
    }

    const clientIp = getClientIp(req);
    const rateLimitResult = checkRateLimit({
      key: `tifa:${clientIp}`,
      limit: RATE_LIMIT_MAX,
      windowMs: RATE_LIMIT_WINDOW_MS,
    });

    if (!rateLimitResult.allowed) {
      return jsonError("RATE_LIMITED", "Too many Tifa requests. Please slow down.", 429, {
        retryable: true,
        publicDetails: { retry_after_seconds: rateLimitResult.retryAfterSeconds },
      });
    }

    // --- 2. Upstream AI Call ---
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIFA_TIMEOUT_MS);

    const tifaPrompt = await getTifaPrompt();
    const finalPrompt = `${tifaPrompt}
User message: ${message}`;
    const model = process.env.TIFA_MODEL || 'gemma3:1b';

    const ollamaRes = await fetch(process.env.TIFA_API_URL!, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt: finalPrompt, stream: true }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!ollamaRes.ok) {
      const errorText = await ollamaRes.text();
      return jsonError("UPSTREAM_AI_ERROR", "The AI service failed to respond.", 502, {
        details: { status: ollamaRes.status, statusText: ollamaRes.statusText, body: errorText },
        retryable: true,
      });
    }

    // --- 3. SSE Stream Transformation ---
    const stream = new ReadableStream({
      async start(streamController) {
        let closed = false;
        let completedNormally = false;

        const enqueue = (event: string, data: unknown) => {
          if (!closed) {
            streamController.enqueue(sse(event, data));
          }
        };

        const close = () => {
          if (!closed) {
            closed = true;
            streamController.close();
          }
        };

        // Ensure timeout is cleared and stream is closed on abort
        controller.signal.addEventListener("abort", () => {
          enqueue("error", { code: "AI_TIMEOUT", message: "The AI service took too long to respond." });
          close();
        });

        try {
          enqueue("start", { model });

          if (!ollamaRes.body) {
            enqueue("error", { code: "INTERNAL_ERROR", message: "Upstream response body is empty." });
            return;
          }

          const reader = ollamaRes.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          outer: while (true) {
            const { done, value } = await reader.read();
            if (done) {
              if (buffer) {
                try {
                  const json = JSON.parse(buffer);
                  if (json.response) enqueue("delta", { text: json.response });
                } catch {}
              }
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\\n');

            for (let i = 0; i < lines.length - 1; i++) {
              const line = lines[i].trim();
              if (!line) continue;
              try {
                const json = JSON.parse(line);
                if (json.error) throw new Error(json.error);
                if (json.response) enqueue("delta", { text: json.response });
                if (json.done) {
                  completedNormally = true;
                  break outer;
                }
              } catch (e) {
                console.error("Error parsing Ollama stream chunk:", line, e);
              }
            }
            buffer = lines[lines.length - 1];
          }
          // If the loop finishes without hitting json.done, we still consider it normal completion.
          if (!completedNormally) completedNormally = true;

        } catch {
          enqueue("error", { code: "INTERNAL_ERROR", message: "Error reading upstream response." });
        } finally {
          if (completedNormally) {
            enqueue("done", { model });
          }
          close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });

  } catch (err: unknown) {
     if (err instanceof Error && err.name === 'AbortError') {
        return jsonError("AI_TIMEOUT", "The AI service timed out before streaming.", 504, { retryable: true });
      }
    return jsonError("INTERNAL_ERROR", "An unexpected server error occurred.", 500, {
      details: err instanceof Error ? err.message : String(err),
    });
  }
}
