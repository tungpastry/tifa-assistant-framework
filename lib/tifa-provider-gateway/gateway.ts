import { createLlmRouter, type LlmRouterOptions } from "@/lib/llm/router";
import { GeminiProvider } from "@/lib/llm/providers/gemini";
import { OllamaProvider } from "@/lib/llm/providers/ollama";
import { OpenAiProvider } from "@/lib/llm/providers/openai";
import { QwenProvider } from "@/lib/llm/providers/qwen";
import type { LlmProvider } from "@/lib/llm/provider";
import type { LlmRouterPolicy } from "@/lib/llm/types";
import type { ProviderGatewayConfig } from "./types";

const POLICY_FALLBACKS: Record<LlmRouterPolicy, string[]> = {
  "local-first": ["ollama", "qwen", "openai", "gemini"],
  "cloud-first": ["openai", "gemini", "qwen", "ollama"],
  "cost-aware": ["ollama", "qwen", "gemini", "openai"],
  "privacy-first": ["ollama", "qwen", "openai", "gemini"],
};

export function createProviderGatewayProviders(config: Partial<ProviderGatewayConfig> = {}): LlmProvider[] {
  return [
    new OllamaProvider({
      defaultModel: config.defaultModel,
      timeoutMs: config.timeoutMs,
    }),
    new OpenAiProvider(),
    new GeminiProvider(),
    new QwenProvider(),
  ];
}

export function getProviderFallbackOrder(config: Partial<ProviderGatewayConfig> = {}) {
  if (config.fallbackOrder && config.fallbackOrder.length > 0) {
    return config.fallbackOrder;
  }

  const policy = config.policy ?? "local-first";
  return POLICY_FALLBACKS[policy];
}

export function createLocalFirstProviderGateway(
  config: Partial<ProviderGatewayConfig> = {}
) {
  return createLlmRouter({
    policy: config.policy ?? "local-first",
    fallbackOrder: getProviderFallbackOrder(config),
    providers: createProviderGatewayProviders(config),
  } satisfies LlmRouterOptions);
}
