import type { AssistantConfig, ModelPolicy, ToolPolicy, UiPolicy, VoicePolicy } from "./types";

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
  return {
    routingMode: "local-first",
    allowedProviders: ["ollama"],
    defaultProvider: "ollama",
    defaultModel: process.env.TIFA_MODEL || "gemma3:1b",
    fallbackOrder: ["ollama"],
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
