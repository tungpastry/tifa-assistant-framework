// Force the use of Node.js runtime
export const runtime = "nodejs";

import { jsonError } from "@/lib/api";
import {
  buildTifaPrompt,
  checkTifaRateLimit,
  createAbortController,
  getTifaRuntimeConfig,
  parseTifaRequestBody,
  readTifaPrompt,
} from "@/lib/tifa-runtime";

// SSE encoder
const encoder = new TextEncoder();
function sse(event: string, data: unknown) {
  return encoder.encode(`event: ${event}
data: ${JSON.stringify(data)}

`);
}

export async function POST(req: Request) {
  try {
    const config = getTifaRuntimeConfig();
    const parsedRequest = await parseTifaRequestBody(req);
    if (!parsedRequest.ok) return parsedRequest.response;

    const rateLimitResponse = checkTifaRateLimit(req, config);
    if (rateLimitResponse) return rateLimitResponse;

    const abort = createAbortController(config.timeoutMs);

    const tifaPrompt = await readTifaPrompt(config.promptPath);
    const finalPrompt = buildTifaPrompt(
      tifaPrompt,
      parsedRequest.body.message,
      parsedRequest.body.mood
    );

    let ollamaRes: Response;
    try {
      ollamaRes = await fetch(config.apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: config.model, prompt: finalPrompt, stream: true }),
        signal: abort.controller.signal,
      });
    } catch (err) {
      abort.clear();
      throw err;
    }

    abort.clear();

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
        abort.controller.signal.addEventListener("abort", () => {
          enqueue("error", { code: "AI_TIMEOUT", message: "The AI service took too long to respond." });
          close();
        });

        try {
          enqueue("start", { model: config.model });

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
            const lines = buffer.split("\n");

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
            enqueue("done", { model: config.model });
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
