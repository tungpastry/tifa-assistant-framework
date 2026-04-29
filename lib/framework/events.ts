import { randomUUID } from "crypto";

export type AssistantEventType =
  | "session.created"
  | "message.created"
  | "stream.started"
  | "stream.delta"
  | "stream.completed"
  | "stream.failed"
  | "provider.selected"
  | "tool.started"
  | "tool.completed"
  | "tool.rejected"
  | "voice.job.created"
  | "voice.job.completed"
  | "usage.recorded"
  | "audit.recorded";

export interface AssistantEvent {
  id: string;
  type: AssistantEventType;
  tenantId: string;
  assistantId?: string;
  sessionId?: string;
  messageId?: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export function createAssistantEvent(input: {
  type: AssistantEventType;
  tenantId: string;
  assistantId?: string;
  sessionId?: string;
  messageId?: string;
  payload?: Record<string, unknown>;
}): AssistantEvent {
  return {
    id: `evt_${randomUUID()}`,
    type: input.type,
    tenantId: input.tenantId,
    assistantId: input.assistantId,
    sessionId: input.sessionId,
    messageId: input.messageId,
    payload: input.payload ?? {},
    createdAt: new Date().toISOString(),
  };
}

