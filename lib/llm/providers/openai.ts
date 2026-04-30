import { streamFromTextResponse, type LlmProvider } from "../provider";
import type { LlmHealth, LlmRequest } from "../types";
import { createProviderTextResponse, fetchJson, resolveProviderModel, toOpenAiMessages } from "./shared";

export class OpenAiProvider implements LlmProvider {
  name = "openai";
  defaultModel = process.env.OPENAI_MODEL || "gpt-4o-mini";
  private apiKey = process.env.OPENAI_API_KEY;
  private baseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
  private timeoutMs = Number.parseInt(process.env.OPENAI_TIMEOUT_MS || "20000", 10);

  async generate(input: LlmRequest) {
    const startedAt = Date.now();
    if (!this.apiKey) {
      throw new Error("OPENAI_API_KEY is not configured.");
    }

    const model = resolveProviderModel(input, this.name, this.defaultModel);
    const raw = await fetchJson({
      url: `${this.baseUrl.replace(/\/$/, "")}/chat/completions`,
      apiKey: this.apiKey,
      timeoutMs: this.timeoutMs,
      body: {
        model,
        messages: toOpenAiMessages(input),
        temperature: input.temperature,
        max_tokens: input.maxTokens,
      },
    });
    const text = typeof raw?.choices?.[0]?.message?.content === "string"
      ? raw.choices[0].message.content
      : "";

    if (!text) {
      throw new Error("OpenAI response did not include assistant text.");
    }

    return createProviderTextResponse({
      text,
      provider: this.name,
      model,
      startedAt,
      raw,
      usage: {
        inputTokens: raw?.usage?.prompt_tokens,
        outputTokens: raw?.usage?.completion_tokens,
        totalTokens: raw?.usage?.total_tokens,
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
        details: { reason: "OPENAI_API_KEY is not configured.", model: this.defaultModel },
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
