import type { AssistantConfig, ModelPolicy, ToolPolicy, UiPolicy, VoicePolicy } from "./types";

type LlmRouterPolicy = ModelPolicy["routingMode"];

export type TifaRuntimeMode = "local" | "hybrid" | "saas";

export interface FrameworkRuntimeConfig {
  mode: TifaRuntimeMode;
  defaultTenantId: string;
  defaultAssistantId: string;
  localFirst: boolean;
  textToSqlEnabled: boolean;
  postgresEnabled: boolean;
  redisEnabled: boolean;
  objectStorageEnabled: boolean;
}

function parseBooleanFlag(value: string | undefined, fallback = false) {
  if (value === undefined || value === "") return fallback;
  return value === "1" || value.toLowerCase() === "true";
}

function parseRuntimeMode(value: string | undefined): TifaRuntimeMode {
  if (value === "hybrid" || value === "saas") return value;
  return "local";
}

function parseRoutingPolicy(value: string | undefined): LlmRouterPolicy {
  if (value === "cloud-first" || value === "cost-aware" || value === "privacy-first") {
    return value;
  }
  return "local-first";
}

function parseFallbackOrder(value: string | undefined, fallback: string[]) {
  if (!value) return fallback;
  return value.split(",").map((provider) => provider.trim()).filter(Boolean);
}

export function getFrameworkRuntimeConfig(): FrameworkRuntimeConfig {
  const mode = process.env.TIFA_RUNTIME_MODE
    ? parseRuntimeMode(process.env.TIFA_RUNTIME_MODE)
    : parseBooleanFlag(process.env.TIFA_SAAS_MODE)
    ? "saas"
    : "local";

  return {
    mode,
    defaultTenantId: process.env.TIFA_DEFAULT_TENANT_ID || "local",
    defaultAssistantId: process.env.TIFA_DEFAULT_ASSISTANT_ID || "tifa-assistant",
    localFirst: mode === "local" || parseBooleanFlag(process.env.TIFA_LOCAL_FIRST, true),
    textToSqlEnabled: parseBooleanFlag(process.env.TIFA_TEXT_TO_SQL_ENABLED),
    postgresEnabled: parseBooleanFlag(process.env.TIFA_PG_ENABLED),
    redisEnabled: parseBooleanFlag(process.env.TIFA_REDIS_ENABLED),
    objectStorageEnabled: parseBooleanFlag(process.env.TIFA_OBJECT_STORAGE_ENABLED),
  };
}

export function createDefaultModelPolicy(): ModelPolicy {
  const routingMode = parseRoutingPolicy(process.env.TIFA_LLM_ROUTING_POLICY);
  const defaultFallbacks: Record<LlmRouterPolicy, string[]> = {
    "local-first": ["ollama", "qwen", "openai", "gemini"],
    "cloud-first": ["openai", "gemini", "qwen", "ollama"],
    "cost-aware": ["ollama", "qwen", "gemini", "openai"],
    "privacy-first": ["ollama", "qwen", "openai", "gemini"],
  };

  return {
    routingMode,
    allowedProviders: ["ollama", "openai", "gemini", "qwen"],
    defaultProvider: process.env.TIFA_LLM_PROVIDER || "ollama",
    defaultModel: process.env.TIFA_MODEL || "gemma3:1b",
    fallbackOrder: parseFallbackOrder(process.env.TIFA_LLM_FALLBACK_ORDER, defaultFallbacks[routingMode]),
  };
}

export function createDefaultToolPolicy(): ToolPolicy {
  return {
    enabled: false,
    allowedTools: [],
    requireApprovalFor: [],
  };
}

export function createDefaultVoicePolicy(): VoicePolicy {
  return {
    enabled: true,
    defaultProvider: "piper",
    defaultVoiceId: "tifa-default",
    allowVoiceCloning: false,
    maxInputCharacters: 500,
  };
}

export function createDefaultUiPolicy(): UiPolicy {
  return {
    showProviderBadge: false,
    showToolTrace: false,
    showCitations: false,
    showQuotaBadge: false,
    allowVoiceToggle: true,
  };
}

export function createLocalAssistantConfig(): AssistantConfig {
  const runtime = getFrameworkRuntimeConfig();

  return {
    id: runtime.defaultAssistantId,
    tenantId: runtime.defaultTenantId,
    slug: "chat-tifa",
    name: "Tifa Assistant",
    locale: process.env.TIFA_DEFAULT_LOCALE || "en-US",
    defaultMood: "focused",
    modelPolicy: createDefaultModelPolicy(),
    toolPolicy: createDefaultToolPolicy(),
    voicePolicy: createDefaultVoicePolicy(),
    uiPolicy: createDefaultUiPolicy(),
  };
}
