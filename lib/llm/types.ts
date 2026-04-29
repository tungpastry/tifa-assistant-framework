import type { AssistantMessageRole, TokenUsage } from "@/lib/framework/types";

export type LlmProviderName = "ollama" | "openai" | "gemini" | "qwen" | "mock" | "custom";

export type LlmRouterPolicy = "local-first" | "cloud-first" | "cost-aware" | "privacy-first";

export interface LlmMessage {
  role: AssistantMessageRole;
  content: string;
  name?: string;
}

export interface LlmToolDefinition {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

export interface LlmRequest {
  messages: LlmMessage[];
  systemPrompt?: string;
  tools?: LlmToolDefinition[];
  responseFormat?: "text" | "json" | { type: string; schema?: Record<string, unknown> };
  temperature?: number;
  maxTokens?: number;
  tenantId?: string;
  assistantId?: string;
  sessionId?: string;
  provider?: LlmProviderName | string;
  model?: string;
  metadata?: Record<string, unknown>;
}

export interface LlmResponse {
  text: string;
  provider: string;
  model: string;
  usage: TokenUsage;
  latencyMs: number;
  raw?: unknown;
}

export type LlmStreamEvent =
  | { type: "start"; provider: string; model: string }
  | { type: "delta"; text: string }
  | { type: "done"; response: LlmResponse }
  | { type: "error"; code: string; message: string; retryable: boolean };

export interface LlmHealth {
  provider: string;
  status: "ok" | "degraded" | "disabled" | "down";
  latencyMs?: number;
  details?: Record<string, unknown>;
}

export interface CostEstimate {
  inputTokens?: number;
  outputTokens?: number;
  estimatedCostUsd?: number;
  currency: "USD";
}

export interface ModelProfile {
  id: string;
  provider: LlmProviderName;
  model: string;
  label: string;
  contextWindow?: number;
  local: boolean;
  privacyClass: "local" | "byok" | "vendor";
  defaultForPolicy?: LlmRouterPolicy[];
}

export const MODEL_PROFILES: ModelProfile[] = [
  {
    id: "ollama/gemma3:4b-it-q4_K_M",
    provider: "ollama",
    model: "gemma3:4b-it-q4_K_M",
    label: "Ollama Gemma 3 4B IT Q4",
    local: true,
    privacyClass: "local",
    defaultForPolicy: ["local-first", "privacy-first"],
  },
  {
    id: "ollama/gemma3:1b-it-qat",
    provider: "ollama",
    model: "gemma3:1b-it-qat",
    label: "Ollama Gemma 3 1B QAT",
    local: true,
    privacyClass: "local",
  },
  {
    id: "ollama/qwen3:4b-instruct-2507-q4_K_M",
    provider: "ollama",
    model: "qwen3:4b-instruct-2507-q4_K_M",
    label: "Ollama Qwen 3 4B Instruct Q4",
    local: true,
    privacyClass: "local",
  },
  {
    id: "ollama/qwen3:1.7b-q4_K_M",
    provider: "ollama",
    model: "qwen3:1.7b-q4_K_M",
    label: "Ollama Qwen 3 1.7B Q4",
    local: true,
    privacyClass: "local",
  },
  {
    id: "gemini/default",
    provider: "gemini",
    model: "default",
    label: "Gemini Default",
    local: false,
    privacyClass: "vendor",
    defaultForPolicy: ["cloud-first", "cost-aware"],
  },
  {
    id: "openai/default",
    provider: "openai",
    model: "default",
    label: "OpenAI Default",
    local: false,
    privacyClass: "vendor",
  },
  {
    id: "qwen/api",
    provider: "qwen",
    model: "default",
    label: "Qwen API Default",
    local: false,
    privacyClass: "vendor",
  },
];

