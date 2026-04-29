import { createTextResponse, streamFromTextResponse, type LlmProvider } from "../provider";
import type { LlmHealth, LlmRequest } from "../types";

export class GeminiProvider implements LlmProvider {
  name = "gemini";
  defaultModel = process.env.GEMINI_MODEL || "default";

  async generate(input: LlmRequest) {
    const startedAt = Date.now();

    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured.");
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
      status: process.env.GEMINI_API_KEY ? "degraded" : "disabled",
      details: { scaffold: true },
    };
  }
}

