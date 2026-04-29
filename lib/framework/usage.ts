import { randomUUID } from "crypto";
import type { UsageEvent } from "./types";

export type UsageMeter =
  | "chat.request"
  | "chat.stream"
  | "llm.input_tokens"
  | "llm.output_tokens"
  | "tool.call"
  | "voice.characters"
  | "voice.seconds"
  | "data.query"
  | "storage.audio_bytes";

export interface CreateUsageEventInput {
  tenantId: string;
  assistantId?: string;
  sessionId?: string;
  meter: UsageMeter | string;
  quantity: number;
  unit: string;
  provider?: string;
  model?: string;
  estimatedCostUsd?: number;
  metadata?: Record<string, unknown>;
}

export function createUsageEvent(input: CreateUsageEventInput): UsageEvent {
  return {
    id: `usage_${randomUUID()}`,
    tenantId: input.tenantId,
    assistantId: input.assistantId,
    sessionId: input.sessionId,
    meter: input.meter,
    quantity: input.quantity,
    unit: input.unit,
    provider: input.provider,
    model: input.model,
    estimatedCostUsd: input.estimatedCostUsd,
    metadata: input.metadata ?? {},
    createdAt: new Date().toISOString(),
  };
}

export function isBillableUsageEvent(event: Pick<UsageEvent, "quantity">) {
  return event.quantity > 0;
}

