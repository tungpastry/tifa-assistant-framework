import { streamFromTextResponse, type LlmProvider } from "../provider";
import type { LlmHealth, LlmRequest } from "../types";
import { buildPrompt, createProviderTextResponse, fetchJson, resolveProviderModel } from "./shared";

export class GeminiProvider implements LlmProvider {
  name = "gemini";
  defaultModel = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  private apiKey = process.env.GEMINI_API_KEY;
  private baseUrl = process.env.GEMINI_API_URL || "https://generativelanguage.googleapis.com/v1beta";
  private timeoutMs = Number.parseInt(process.env.GEMINI_TIMEOUT_MS || "20000", 10);

  async generate(input: LlmRequest) {
    const startedAt = Date.now();
    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY is not configured.");
    }

    const model = resolveProviderModel(input, this.name, this.defaultModel);
    const raw = await fetchJson({
      url: `${this.baseUrl.replace(/\/$/, "")}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`,
      timeoutMs: this.timeoutMs,
      body: {
        contents: [
          {
            role: "user",
            parts: [{ text: buildPrompt(input) }],
          },
        ],
        generationConfig: {
          temperature: input.temperature,
          maxOutputTokens: input.maxTokens,
        },
      },
    });
    const text = raw?.candidates?.[0]?.content?.parts
      ?.map((part: { text?: unknown }) => typeof part.text === "string" ? part.text : "")
      .join("")
      .trim();

    if (!text) {
      throw new Error("Gemini response did not include assistant text.");
    }

    return createProviderTextResponse({
      text,
      provider: this.name,
      model,
      startedAt,
      raw,
      usage: {
        inputTokens: raw?.usageMetadata?.promptTokenCount,
        outputTokens: raw?.usageMetadata?.candidatesTokenCount,
        totalTokens: raw?.usageMetadata?.totalTokenCount,
      },
    });
  }

  async *stream(input: LlmRequest) {
    const response = await this.generate(input);
    yield* streamFromTextResponse(response);
  }

  async health(): Promise<LlmHealth> {
    if (!this.apiKey) {
      return {
        provider: this.name,
        status: "disabled",
        details: { reason: "GEMINI_API_KEY is not configured.", model: this.defaultModel },
      };
    }

    return {
      provider: this.name,
      status: "degraded",
      details: {
        model: this.defaultModel,
        baseUrl: this.baseUrl,
        live_check: false,
        reason: "Credentials are configured, but health does not call the vendor API.",
      },
    };
  }
}
