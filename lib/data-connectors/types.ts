export type ConnectorStatus = "ok" | "degraded" | "disabled" | "down";

export interface DataConnectorHealth {
  name: string;
  status: ConnectorStatus;
  details?: Record<string, unknown>;
}

export interface DataConnectorContext {
  tenantId?: string;
  assistantId?: string;
  sessionId?: string;
  userId?: string;
  requestId?: string;
  saasMode?: boolean;
}

export interface DataQueryInput {
  sql: string;
  params?: unknown[];
  context: DataConnectorContext;
  maxRows?: number;
  statementTimeoutMs?: number;
  allowedViews?: string[];
}

export interface DataQueryResult {
  columns: string[];
  rows: Array<Record<string, unknown>>;
  rowCount: number;
  latencyMs: number;
  source: string;
  warnings: string[];
}

export interface QueryAuditEvent {
  connector: string;
  sql: string;
  tenantId?: string;
  assistantId?: string;
  sessionId?: string;
  allowed: boolean;
  reasons: string[];
  createdAt: string;
}

export interface DataConnector {
  name: string;
  health(): Promise<DataConnectorHealth>;
  query(input: DataQueryInput): Promise<DataQueryResult>;
}

