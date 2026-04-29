import { createTextResponse, streamFromTextResponse, type LlmProvider } from "../provider";
import type { LlmHealth, LlmRequest } from "../types";

export class QwenProvider implements LlmProvider {
  name = "qwen";
  defaultModel = process.env.QWEN_MODEL || "default";

  async generate(input: LlmRequest) {
    const startedAt = Date.now();

    if (!process.env.QWEN_API_KEY && !process.env.QWEN_API_URL) {
      throw new Error("Qwen API credentials or endpoint are not configured.");
    }

    return createTextResponse({
      text: "",
      provider: this.name,
      model: input.model || this.defaultModel,
      startedAt,
      raw: { scaffold: true },
    });
  }

  async *stream(input: LlmRequest) {
    const response = await this.generate(input);
    yield* streamFromTextResponse(response);
  }

  async health(): Promise<LlmHealth> {
    return {
      provider: this.name,
      status: process.env.QWEN_API_KEY || process.env.QWEN_API_URL ? "degraded" : "disabled",
      details: { scaffold: true },
    };
  }
}

