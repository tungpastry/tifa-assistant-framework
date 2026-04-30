import { streamFromTextResponse, type LlmProvider } from "../provider";
import type { LlmHealth, LlmRequest } from "../types";
import { createProviderTextResponse, fetchJson, resolveProviderModel, toOpenAiMessages } from "./shared";

export class QwenProvider implements LlmProvider {
  name = "qwen";
  defaultModel = process.env.QWEN_MODEL || "qwen-plus";
  private apiKey = process.env.QWEN_API_KEY;
  private baseUrl = process.env.QWEN_API_URL || "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";
  private timeoutMs = Number.parseInt(process.env.QWEN_TIMEOUT_MS || "20000", 10);

  async generate(input: LlmRequest) {
    const startedAt = Date.now();
    if (!this.apiKey && !process.env.QWEN_API_URL) {
      throw new Error("QWEN_API_KEY or QWEN_API_URL is not configured.");
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
      throw new Error("Qwen response did not include assistant text.");
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
    if (!this.apiKey && !process.env.QWEN_API_URL) {
      return {
        provider: this.name,
        status: "disabled",
        details: { reason: "QWEN_API_KEY or QWEN_API_URL is not configured.", model: this.defaultModel },
      };
    }

    return {
      provider: this.name,
      status: "degraded",
      details: {
        model: this.defaultModel,
        baseUrl: this.baseUrl,
        apiKeyConfigured: Boolean(this.apiKey),
        live_check: false,
        reason: "Endpoint or credentials are configured, but health does not call the provider API.",
      },
    };
  }
}
