import { NextResponse } from "next/server";
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

export async function POST(req: Request) {
  try {
    const config = getTifaRuntimeConfig();
    const parsedRequest = await parseTifaRequestBody(req);
    if (!parsedRequest.ok) return parsedRequest.response;

    const rateLimitResponse = checkTifaRateLimit(req, config);
    if (rateLimitResponse) return rateLimitResponse;

    try {
      const assistantConfig = createLocalAssistantConfig();
      const gateway = createLocalFirstProviderGateway({
        policy: assistantConfig.modelPolicy.routingMode,
        fallbackOrder: assistantConfig.modelPolicy.fallbackOrder,
        defaultProvider: assistantConfig.modelPolicy.defaultProvider,
        defaultModel: config.model,
        timeoutMs: config.timeoutMs,
      });
      const tifaPrompt = await readTifaPrompt(config.promptPath);
      const finalPrompt = buildTifaPrompt(
        tifaPrompt,
        parsedRequest.body.message,
        parsedRequest.body.mood
      );

      const response = await gateway.generate({
        tenantId: assistantConfig.tenantId,
        assistantId: assistantConfig.id,
        model: config.model,
        messages: [{ role: "user", content: finalPrompt }],
        metadata: { prebuiltPrompt: true },
      });

      const reply = response.text || "I'm here, but I couldn't think of a reply. Let’s talk markets 💬";

      return NextResponse.json({ reply, model: response.model || config.model });

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (err instanceof Error && (err.name === "AbortError" || message.includes("aborted"))) {
        return jsonError("AI_TIMEOUT", "The AI service took too long to respond.", 504, { retryable: true });
      }
      return jsonError("UPSTREAM_AI_ERROR", "The AI service failed to respond.", 502, {
        details: message,
        retryable: true,
      });
    }
  } catch (err: unknown) {
    return jsonError("INTERNAL_ERROR", "An unexpected server error occurred.", 500, {
      details: err instanceof Error ? err.message : String(err),
    });
  }
}
