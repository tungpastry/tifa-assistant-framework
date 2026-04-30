import type { LlmProvider } from "./provider";
import type { LlmProviderName, LlmRequest, LlmResponse, LlmRouterPolicy, LlmStreamEvent } from "./types";

export interface LlmRouterOptions {
  policy: LlmRouterPolicy;
  fallbackOrder: Array<LlmProviderName | string>;
  providers: LlmProvider[];
}

export class LlmRouter {
  private providers: Map<string, LlmProvider>;
  private policy: LlmRouterPolicy;
  private fallbackOrder: string[];

  constructor(options: LlmRouterOptions) {
    this.providers = new Map(options.providers.map((provider) => [provider.name, provider]));
    this.policy = options.policy;
    this.fallbackOrder = options.fallbackOrder;
  }

  getPolicy() {
    return this.policy;
  }

  getProvider(name: string): LlmProvider | null {
    return this.providers.get(name) ?? null;
  }

  getFallbackOrder(request?: Pick<LlmRequest, "provider">) {
    if (request?.provider) {
      return [request.provider, ...this.fallbackOrder.filter((provider) => provider !== request.provider)];
    }

    return this.fallbackOrder;
  }

  async generate(request: LlmRequest): Promise<LlmResponse> {
    const errors: string[] = [];

    for (const providerName of this.getFallbackOrder(request)) {
      const provider = this.getProvider(providerName);
      if (!provider) continue;

      try {
        return await provider.generate(request);
      } catch (error) {
        errors.push(`${providerName}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    throw new Error(`No LLM provider succeeded for ${this.policy} policy. ${errors.join(" | ")}`);
  }

  async *stream(request: LlmRequest): AsyncIterable<LlmStreamEvent> {
    const errors: string[] = [];

    for (const providerName of this.getFallbackOrder(request)) {
      const provider = this.getProvider(providerName);
      if (!provider) continue;

      let failed = false;
      for await (const event of provider.stream(request)) {
        if (event.type === "error") {
          failed = true;
          errors.push(`${providerName}: ${event.message}`);
          break;
        }
        yield event;
        if (event.type === "done") return;
      }

      if (!failed) return;
    }

    yield {
      type: "error",
      code: "PROVIDER_UNAVAILABLE",
      message: errors.length > 0
        ? `No LLM provider succeeded for ${this.policy} policy. ${errors.join(" | ")}`
        : "No LLM provider is available for streaming.",
      retryable: true,
    };
  }
}

export function createLlmRouter(options: LlmRouterOptions) {
  return new LlmRouter(options);
}
