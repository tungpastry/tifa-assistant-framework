import { createTextResponse, type LlmProvider } from "../provider";
import type { CostEstimate, LlmHealth, LlmRequest, LlmStreamEvent } from "../types";

export interface OllamaProviderOptions {
  baseUrl?: string;
  generatePath?: string;
  defaultModel?: string;
  timeoutMs?: number;
}

function buildPrompt(input: LlmRequest) {
  if (input.metadata?.prebuiltPrompt === true && input.messages.length > 0) {
    return input.messages[0].content;
  }

  const lines = input.messages.map((message) => `${message.role}: ${message.content}`);
  return [input.systemPrompt, ...lines].filter(Boolean).join("\n");
}

export class OllamaProvider implements LlmProvider {
  name = "ollama";
  defaultModel: string;
  private baseUrl: string;
  private generatePath: string;
  private timeoutMs: number;

  constructor(options: OllamaProviderOptions = {}) {
    this.baseUrl = options.baseUrl || process.env.OLLAMA_URL || "http://127.0.0.1:11434";
    this.generatePath = options.generatePath || process.env.TIFA_API_URL || `${this.baseUrl}/api/generate`;
    this.defaultModel = options.defaultModel || process.env.TIFA_MODEL || "gemma3:1b";
    this.timeoutMs = options.timeoutMs ?? 20000;
  }

  async generate(input: LlmRequest) {
    const startedAt = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(this.generatePath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: input.model || this.defaultModel,
          prompt: buildPrompt(input),
          stream: false,
          options: {
            temperature: input.temperature,
            num_predict: input.maxTokens,
          },
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`Ollama returned ${res.status}`);
      }

      const raw = await res.json();
      const text = typeof raw.response === "string" ? raw.response : "";

      return createTextResponse({
        text,
        provider: this.name,
        model: input.model || this.defaultModel,
        startedAt,
        raw,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async *stream(input: LlmRequest): AsyncIterable<LlmStreamEvent> {
    const startedAt = Date.now();
    const model = input.model || this.defaultModel;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);
    let text = "";

    yield { type: "start" as const, provider: this.name, model };

    try {
      const res = await fetch(this.generatePath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          prompt: buildPrompt(input),
          stream: true,
          options: {
            temperature: input.temperature,
            num_predict: input.maxTokens,
          },
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        yield {
          type: "error",
          code: "PROVIDER_UNAVAILABLE",
          message: `Ollama stream returned ${res.status}`,
          retryable: true,
        };
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      outer: while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");

        for (let i = 0; i < lines.length - 1; i++) {
          const event = parseOllamaStreamLine(lines[i]);
          if (!event) continue;

          if (event.type === "delta") {
            text += event.text;
            yield event;
          }

          if (event.type === "done") {
            break outer;
          }

          if (event.type === "error") {
            yield event;
            return;
          }
        }

        buffer = lines[lines.length - 1];
      }

      const response = createTextResponse({
        text,
        provider: this.name,
        model,
        startedAt,
      });

      yield { type: "done", response };
    } catch (error) {
      yield {
        type: "error",
        code: error instanceof Error && error.name === "AbortError" ? "AI_TIMEOUT" : "PROVIDER_UNAVAILABLE",
        message: error instanceof Error ? error.message : String(error),
        retryable: true,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async health(): Promise<LlmHealth> {
    const startedAt = Date.now();

    try {
      const res = await fetch(`${this.baseUrl}/api/tags`);
      return {
        provider: this.name,
        status: res.ok ? "ok" : "down",
        latencyMs: Date.now() - startedAt,
        details: { baseUrl: this.baseUrl, status: res.status },
      };
    } catch (error) {
      return {
        provider: this.name,
        status: "down",
        latencyMs: Date.now() - startedAt,
        details: { baseUrl: this.baseUrl, error: error instanceof Error ? error.message : String(error) },
      };
    }
  }

  async estimateCost(input: LlmRequest): Promise<CostEstimate> {
    const inputTokens = await this.countTokens(input);

    return {
      inputTokens,
      outputTokens: input.maxTokens,
      estimatedCostUsd: 0,
      currency: "USD",
    };
  }

  async countTokens(input: LlmRequest): Promise<number> {
    const text = buildPrompt(input);
    return Math.max(1, Math.ceil(text.length / 4));
  }
}

function parseOllamaStreamLine(line: string): LlmStreamEvent | { type: "done" } | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  try {
    const data = JSON.parse(trimmed) as {
      response?: unknown;
      error?: unknown;
      done?: unknown;
    };

    if (typeof data.error === "string") {
      return {
        type: "error",
        code: "PROVIDER_UNAVAILABLE",
        message: data.error,
        retryable: true,
      };
    }

    if (typeof data.response === "string" && data.response) {
      return { type: "delta", text: data.response };
    }

    if (data.done) {
      return { type: "done" };
    }
  } catch {
    return null;
  }

  return null;
}
