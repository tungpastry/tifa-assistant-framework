import type { CostEstimate, LlmHealth, LlmRequest, LlmResponse, LlmStreamEvent } from "./types";

export interface LlmProvider {
  name: string;
  defaultModel: string;
  generate(input: LlmRequest): Promise<LlmResponse>;
  stream(input: LlmRequest): AsyncIterable<LlmStreamEvent>;
  health(): Promise<LlmHealth>;
  estimateCost?(input: LlmRequest): Promise<CostEstimate>;
  countTokens?(input: LlmRequest): Promise<number>;
}

export function createTextResponse(input: {
  text: string;
  provider: string;
  model: string;
  startedAt: number;
  raw?: unknown;
}): LlmResponse {
  const estimatedTokens = Math.max(1, Math.ceil(input.text.length / 4));

  return {
    text: input.text,
    provider: input.provider,
    model: input.model,
    usage: {
      outputTokens: estimatedTokens,
      totalTokens: estimatedTokens,
    },
    latencyMs: Date.now() - input.startedAt,
    raw: input.raw,
  };
}

export async function* streamFromTextResponse(response: LlmResponse): AsyncIterable<LlmStreamEvent> {
  yield { type: "start", provider: response.provider, model: response.model };
  if (response.text) {
    yield { type: "delta", text: response.text };
  }
  yield { type: "done", response };
}

