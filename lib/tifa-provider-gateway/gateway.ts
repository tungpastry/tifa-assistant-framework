import { createLlmRouter, type LlmRouterOptions } from "@/lib/llm/router";
import { OllamaProvider } from "@/lib/llm/providers/ollama";
import type { ProviderGatewayConfig } from "./types";

export function createLocalFirstProviderGateway(
  config: Partial<ProviderGatewayConfig> = {}
) {
  return createLlmRouter({
    policy: config.policy ?? "local-first",
    fallbackOrder: config.fallbackOrder ?? [config.defaultProvider ?? "ollama"],
    providers: [
      new OllamaProvider({
        defaultModel: config.defaultModel,
        timeoutMs: config.timeoutMs,
      }),
    ],
  } satisfies LlmRouterOptions);
}
