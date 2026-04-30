import type { AssistantMessage, AssistantSession } from "@/lib/framework/types";

export interface CreateAssistantSessionInput {
  session: AssistantSession;
}

export interface AppendAssistantMessageInput {
  message: AssistantMessage;
}

export interface AssistantPersistenceAdapter {
  name: string;
  enabled: boolean;
  createSession(input: CreateAssistantSessionInput): Promise<AssistantSession>;
  getSession(sessionId: string): Promise<AssistantSession | null>;
  appendMessage(input: AppendAssistantMessageInput): Promise<AssistantMessage>;
  listMessages(sessionId: string): Promise<AssistantMessage[]>;
}

