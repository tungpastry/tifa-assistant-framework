// Force the use of Node.js runtime
export const runtime = "nodejs";

import { jsonError } from "@/lib/api";
import { createLocalAssistantConfig } from "@/lib/framework/config";
import { createLocalFirstProviderGateway } from "@/lib/tifa-provider-gateway";
import {
  buildTifaPrompt,
  checkTifaRateLimit,
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

    const tifaPrompt = await readTifaPrompt(config.promptPath);
    const finalPrompt = buildTifaPrompt(
      tifaPrompt,
      parsedRequest.body.message,
      parsedRequest.body.mood
    );
    const assistantConfig = createLocalAssistantConfig();
    const gateway = createLocalFirstProviderGateway({
      policy: assistantConfig.modelPolicy.routingMode,
      fallbackOrder: assistantConfig.modelPolicy.fallbackOrder,
      defaultProvider: assistantConfig.modelPolicy.defaultProvider,
      defaultModel: config.model,
      timeoutMs: config.timeoutMs,
    });

    // --- 3. SSE Stream Transformation ---
    const stream = new ReadableStream({
      async start(streamController) {
        let closed = false;
        let completedNormally = false;
        let endedWithError = false;
        let activeModel = config.model;
        let activeProvider = "ollama";

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

        try {
          for await (const event of gateway.stream({
            tenantId: assistantConfig.tenantId,
            assistantId: assistantConfig.id,
            model: config.model,
            messages: [{ role: "user", content: finalPrompt }],
            metadata: { prebuiltPrompt: true },
          })) {
            if (event.type === "start") {
              activeModel = event.model;
              activeProvider = event.provider;
              enqueue("start", {
                model: event.model,
                provider: event.provider,
                provider_type: event.provider === "ollama" ? "local" : "cloud",
              });
            } else if (event.type === "delta") {
              enqueue("delta", { text: event.text });
            } else if (event.type === "done") {
              completedNormally = true;
              activeModel = event.response.model;
              activeProvider = event.response.provider;
              enqueue("done", {
                model: event.response.model,
                provider: event.response.provider,
                provider_type: event.response.provider === "ollama" ? "local" : "cloud",
              });
            } else if (event.type === "error") {
              endedWithError = true;
              enqueue("error", { code: event.code, message: event.message });
              return;
            }
          }

        } catch {
          endedWithError = true;
          enqueue("error", { code: "INTERNAL_ERROR", message: "Error reading upstream response." });
        } finally {
          if (!completedNormally && !endedWithError) {
            enqueue("done", {
              model: activeModel,
              provider: activeProvider,
              provider_type: activeProvider === "ollama" ? "local" : "cloud",
            });
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
