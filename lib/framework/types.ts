export type ISODateTimeString = string;

export type TenantStatus = "active" | "suspended" | "deleted";

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  planCode: string;
  status: TenantStatus;
  createdAt: ISODateTimeString;
}

export type AssistantChannel = "web" | "api" | "admin" | "worker" | "custom";

export type AssistantMessageRole = "system" | "user" | "assistant" | "tool";

export interface ModelPolicy {
  routingMode: "local-first" | "cloud-first" | "cost-aware" | "privacy-first";
  allowedProviders: string[];
  defaultProvider?: string;
  defaultModel?: string;
  fallbackOrder: string[];
  maxInputTokens?: number;
  maxOutputTokens?: number;
}

export interface ToolPolicy {
  enabled: boolean;
  allowedTools: string[];
  requireApprovalFor: string[];
  maxDurationMs?: number;
}

export interface VoicePolicy {
  enabled: boolean;
  defaultProvider: VoiceProviderConfig["provider"];
  defaultVoiceId?: string;
  allowVoiceCloning: boolean;
  maxInputCharacters?: number;
}

export interface UiPolicy {
  showProviderBadge: boolean;
  showToolTrace: boolean;
  showCitations: boolean;
  showQuotaBadge: boolean;
  allowVoiceToggle: boolean;
}

export interface AssistantConfig {
  id: string;
  tenantId: string;
  slug: string;
  name: string;
  locale: string;
  defaultMood: string;
  modelPolicy: ModelPolicy;
  toolPolicy: ToolPolicy;
  voicePolicy: VoicePolicy;
  uiPolicy: UiPolicy;
}

export interface AssistantSession {
  id: string;
  tenantId: string;
  assistantId: string;
  userId?: string;
  channel: AssistantChannel;
  locale: string;
  mood: string;
  metadata: Record<string, unknown>;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}

export interface TokenUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

export interface AssistantMessage {
  id: string;
  tenantId: string;
  sessionId: string;
  role: AssistantMessageRole;
  content: string;
  contentJson?: Record<string, unknown>;
  provider?: string;
  model?: string;
  usage?: TokenUsage;
  createdAt: ISODateTimeString;
}

export interface UsageEvent {
  id: string;
  tenantId: string;
  assistantId?: string;
  sessionId?: string;
  meter: string;
  quantity: number;
  unit: string;
  provider?: string;
  model?: string;
  estimatedCostUsd?: number;
  metadata: Record<string, unknown>;
  createdAt: ISODateTimeString;
}

export type ToolCallStatus = "queued" | "running" | "succeeded" | "failed" | "rejected";

export interface ToolCall {
  id: string;
  tenantId: string;
  sessionId: string;
  messageId?: string;
  toolName: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  status: ToolCallStatus;
  durationMs?: number;
  createdAt: ISODateTimeString;
}

export interface VoiceProviderConfig {
  provider: "piper" | "vipiper" | "vieneu" | "openai" | "custom";
  voiceId: string;
  modelId: string;
  locale: string;
  sampleRate: number;
  supportsStreaming: boolean;
  supportsVoiceCloning: boolean;
  licenseClass: string;
}

export interface ErrorEnvelope {
  code: string;
  message: string;
  requestId: string;
  retryable: boolean;
  details?: Record<string, unknown>;
}

