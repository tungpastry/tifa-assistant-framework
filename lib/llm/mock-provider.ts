import { createTextResponse, streamFromTextResponse, type LlmProvider } from "./provider";
import type { LlmHealth, LlmRequest } from "./types";

export class MockLlmProvider implements LlmProvider {
  name = "mock";
  defaultModel = "mock/tifa";

  async generate(input: LlmRequest) {
    const startedAt = Date.now();
    const lastUserMessage = [...input.messages].reverse().find((message) => message.role === "user");
    const text = lastUserMessage
      ? `Mock Tifa response: ${lastUserMessage.content}`
      : "Mock Tifa response.";

    return createTextResponse({
      text,
      provider: this.name,
      model: input.model || this.defaultModel,
      startedAt,
    });
  }

  async *stream(input: LlmRequest) {
    const response = await this.generate(input);
    yield* streamFromTextResponse(response);
  }

  async health(): Promise<LlmHealth> {
    return {
      provider: this.name,
      status: "ok",
      details: { mode: "in-memory" },
    };
  }
}

