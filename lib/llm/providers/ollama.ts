import { createTextResponse, streamFromTextResponse, type LlmProvider } from "../provider";
import type { LlmHealth, LlmRequest } from "../types";

export interface OllamaProviderOptions {
  baseUrl?: string;
  generatePath?: string;
  defaultModel?: string;
  timeoutMs?: number;
}

function buildPrompt(input: LlmRequest) {
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

  async *stream(input: LlmRequest) {
    const response = await this.generate(input);
    yield* streamFromTextResponse(response);
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
}

