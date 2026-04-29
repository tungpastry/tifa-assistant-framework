import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import {
  buildTifaPrompt,
  checkTifaRateLimit,
  createAbortController,
  getTifaRuntimeConfig,
  parseTifaRequestBody,
  readTifaPrompt,
} from "@/lib/tifa-runtime";

export async function POST(req: Request) {
  try {
    const config = getTifaRuntimeConfig();
    const parsedRequest = await parseTifaRequestBody(req);
    if (!parsedRequest.ok) return parsedRequest.response;

    const rateLimitResponse = checkTifaRateLimit(req, config);
    if (rateLimitResponse) return rateLimitResponse;

    const { controller, clear } = createAbortController(config.timeoutMs);

    try {
      const tifaPrompt = await readTifaPrompt(config.promptPath);
      const finalPrompt = buildTifaPrompt(
        tifaPrompt,
        parsedRequest.body.message,
        parsedRequest.body.mood
      );

      const res = await fetch(config.apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: config.model,
          prompt: finalPrompt,
          stream: false,
        }),
        signal: controller.signal,
      });

      clear();

      if (!res.ok) {
        const errorText = await res.text();
        return jsonError("UPSTREAM_AI_ERROR", "The AI service failed to respond.", 502, {
          details: { status: res.status, statusText: res.statusText, body: errorText },
          retryable: true,
        });
      }

      const json = await res.json();
      const reply = json.response || "I'm here, but I couldn't think of a reply. Let’s talk markets 💬";

      return NextResponse.json({ reply, model: config.model });

    } catch (err: unknown) {
      clear();
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
