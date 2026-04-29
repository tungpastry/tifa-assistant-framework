import { createTextResponse, streamFromTextResponse, type LlmProvider } from "../provider";
import type { LlmHealth, LlmRequest } from "../types";

export class OpenAiProvider implements LlmProvider {
  name = "openai";
  defaultModel = process.env.OPENAI_MODEL || "default";

  async generate(input: LlmRequest) {
    const startedAt = Date.now();

    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured.");
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
      status: process.env.OPENAI_API_KEY ? "degraded" : "disabled",
      details: { scaffold: true },
    };
  }
}

