import type {
  AppendAssistantMessageInput,
  AssistantPersistenceAdapter,
  CreateAssistantSessionInput,
} from "../persistence";
import type { AssistantMessage, AssistantSession } from "@/lib/framework/types";

export class PostgresSessionAdapter implements AssistantPersistenceAdapter {
  name = "postgres-session-adapter";
  enabled = process.env.TIFA_PG_ENABLED === "1" && process.env.TIFA_SAAS_MODE === "1";

  async createSession(input: CreateAssistantSessionInput): Promise<AssistantSession> {
    this.assertEnabled();
    return input.session;
  }

  async getSession(sessionId: string): Promise<AssistantSession | null> {
    this.assertEnabled();
    void sessionId;
    return null;
  }

  async appendMessage(input: AppendAssistantMessageInput): Promise<AssistantMessage> {
    this.assertEnabled();
    return input.message;
  }

  async listMessages(sessionId: string): Promise<AssistantMessage[]> {
    this.assertEnabled();
    void sessionId;
    return [];
  }

  private assertEnabled() {
    if (!this.enabled) {
      throw new Error("PostgreSQL session adapter is disabled. Set TIFA_SAAS_MODE=1 and TIFA_PG_ENABLED=1 to wire it.");
    }
  }
}

