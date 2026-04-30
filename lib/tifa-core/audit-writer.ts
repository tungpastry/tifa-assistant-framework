export interface AuditEventInput {
  tenantId?: string;
  actorUserId?: string;
  eventType: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditEventWriter {
  write(event: AuditEventInput): Promise<void>;
}

export class NoopAuditEventWriter implements AuditEventWriter {
  async write(event: AuditEventInput): Promise<void> {
    void event;
  }
}

