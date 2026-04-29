import type { DataConnector, DataConnectorHealth, DataQueryInput, DataQueryResult } from "./types";
import { parseAllowedViews, validateReadOnlySql } from "./safety";

export interface PostgresQueryClient {
  query(
    sql: string,
    params?: unknown[]
  ): Promise<{
    rows: Array<Record<string, unknown>>;
    fields?: Array<{ name: string }>;
    rowCount?: number | null;
  }>;
}

export interface PostgresConnectorOptions {
  enabled?: boolean;
  connectionString?: string;
  statementTimeoutMs?: number;
  maxRows?: number;
  allowedViews?: string[];
  client?: PostgresQueryClient;
}

export class PostgresFinancialConnector implements DataConnector {
  name = "postgres-financial";
  private enabled: boolean;
  private connectionString?: string;
  private statementTimeoutMs: number;
  private maxRows: number;
  private allowedViews: string[];
  private client?: PostgresQueryClient;

  constructor(options: PostgresConnectorOptions = {}) {
    this.enabled = options.enabled ?? process.env.TIFA_PG_ENABLED === "1";
    this.connectionString = options.connectionString ?? process.env.TIFA_PG_CONNECTION_STRING;
    this.statementTimeoutMs = options.statementTimeoutMs ?? Number.parseInt(process.env.TIFA_PG_STATEMENT_TIMEOUT_MS || "4000", 10);
    this.maxRows = options.maxRows ?? Number.parseInt(process.env.TIFA_PG_MAX_ROWS || "500", 10);
    this.allowedViews = options.allowedViews ?? parseAllowedViews(process.env.TIFA_PG_ALLOWED_VIEWS);
    this.client = options.client;
  }

  async health(): Promise<DataConnectorHealth> {
    if (!this.enabled) {
      return {
        name: this.name,
        status: "disabled",
        details: { reason: "TIFA_PG_ENABLED is not 1." },
      };
    }

    if (!this.connectionString && !this.client) {
      return {
        name: this.name,
        status: "degraded",
        details: { reason: "No PostgreSQL connection string or injected client configured." },
      };
    }

    return {
      name: this.name,
      status: this.client ? "ok" : "degraded",
      details: {
        maxRows: this.maxRows,
        statementTimeoutMs: this.statementTimeoutMs,
        allowedViews: this.allowedViews,
        driver: this.client ? "injected" : "not-wired",
      },
    };
  }

  async query(input: DataQueryInput): Promise<DataQueryResult> {
    if (!this.enabled) {
      throw new Error("PostgreSQL connector is disabled.");
    }

    const maxRows = input.maxRows ?? this.maxRows;
    const validation = validateReadOnlySql(input.sql, {
      allowedViews: input.allowedViews ?? this.allowedViews,
      maxRows,
      requireTenantContext: input.context.saasMode,
      tenantId: input.context.tenantId,
    });

    if (!validation.allowed) {
      throw new Error(`PostgreSQL query rejected: ${validation.reasons.join(" ")}`);
    }

    if (!this.client) {
      throw new Error("PostgreSQL query client is not configured.");
    }

    const startedAt = Date.now();
    const result = await this.client.query(validation.sql, input.params);
    const rows = result.rows.slice(0, maxRows);
    const columns = result.fields?.map((field) => field.name) ?? Object.keys(rows[0] ?? {});

    return {
      columns,
      rows,
      rowCount: result.rowCount ?? rows.length,
      latencyMs: Date.now() - startedAt,
      source: this.name,
      warnings: validation.warnings,
    };
  }
}

export function createPostgresFinancialConnector(options?: PostgresConnectorOptions) {
  return new PostgresFinancialConnector(options);
}

