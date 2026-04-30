import type {
  CostEstimate,
  LlmHealth,
  LlmRequest,
  LlmResponse,
  LlmRouterPolicy,
  LlmStreamEvent,
} from "@/lib/llm/types";
import type { LlmProvider } from "@/lib/llm/provider";

export type LLMProvider = LlmProvider;
export type LLMRequest = LlmRequest;
export type LLMResponse = LlmResponse;
export type LLMStreamEvent = LlmStreamEvent;
export type LLMHealth = LlmHealth;
export type LLMCostEstimate = CostEstimate;
export type ProviderRoutingPolicy = LlmRouterPolicy;

export interface ProviderGatewayConfig {
  policy: ProviderRoutingPolicy;
  fallbackOrder: string[];
  defaultProvider: string;
  defaultModel?: string;
}

