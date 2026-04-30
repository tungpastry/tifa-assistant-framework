import type { Pool, PoolClient, QueryResult } from "pg";
import type { DataConnector, DataConnectorHealth, DataQueryInput, DataQueryResult } from "./types";
import { parseAllowedViews, validateReadOnlySql } from "./safety";

export interface PostgresQueryClient {
  query(
    sql: string,
    params?: unknown[],
    options?: { statementTimeoutMs?: number }
  ): Promise<{
    rows: Array<Record<string, unknown>>;
    fields?: Array<{ name: string }>;
    rowCount?: number | null;
  }>;
  health?(): Promise<void>;
  close?(): Promise<void>;
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
    this.client = options.client ?? (this.connectionString ? createNodePostgresQueryClient(this.connectionString) : undefined);
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

    const details = {
      maxRows: this.maxRows,
      statementTimeoutMs: this.statementTimeoutMs,
      allowedViews: this.allowedViews,
      driver: this.client ? (this.connectionString ? "pg" : "injected") : "not-wired",
      connectionConfigured: Boolean(this.connectionString || this.client),
    };

    if (!this.client) {
      return {
        name: this.name,
        status: "degraded",
        details: { ...details, reason: "No PostgreSQL query client configured." },
      };
    }

    try {
      await this.client.health?.();
      return { name: this.name, status: "ok", details };
    } catch (err) {
      return {
        name: this.name,
        status: "down",
        details: {
          ...details,
          reason: err instanceof Error ? err.message : String(err),
        },
      };
    }
  }

  async query(input: DataQueryInput): Promise<DataQueryResult> {
    if (!this.enabled) {
      throw new Error("PostgreSQL connector is disabled.");
    }

    const maxRows = Math.min(input.maxRows ?? this.maxRows, this.maxRows);
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
    const result = await this.client.query(validation.sql, input.params, {
      statementTimeoutMs: input.statementTimeoutMs ?? this.statementTimeoutMs,
    });
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

let sharedPool: Pool | null = null;
let sharedPoolConnectionString: string | null = null;

function parseOptionalBoolean(value: string | undefined) {
  if (!value) return false;
  return value === "1" || value.toLowerCase() === "true";
}

async function getPool(connectionString: string): Promise<Pool> {
  if (sharedPool && sharedPoolConnectionString === connectionString) {
    return sharedPool;
  }

  if (sharedPool) {
    await sharedPool.end().catch(() => undefined);
  }

  const pg = await import("pg");
  sharedPool = new pg.Pool({
    connectionString,
    max: Number.parseInt(process.env.TIFA_PG_POOL_MAX || "4", 10),
    idleTimeoutMillis: Number.parseInt(process.env.TIFA_PG_IDLE_TIMEOUT_MS || "30000", 10),
    connectionTimeoutMillis: Number.parseInt(process.env.TIFA_PG_CONNECT_TIMEOUT_MS || "3000", 10),
    application_name: process.env.TIFA_PG_APPLICATION_NAME || "tifa-assistant-framework",
    ssl: parseOptionalBoolean(process.env.TIFA_PG_SSL)
      ? { rejectUnauthorized: process.env.TIFA_PG_SSL_REJECT_UNAUTHORIZED !== "0" }
      : undefined,
  });
  sharedPoolConnectionString = connectionString;
  return sharedPool;
}

function sanitizeTimeoutMs(value: number | undefined) {
  const parsed = Number.isFinite(value) ? Math.floor(Number(value)) : 4000;
  return Math.max(1, Math.min(parsed, 30000));
}

function mapRows(result: QueryResult): Array<Record<string, unknown>> {
  return result.rows.map((row) => ({ ...row }));
}

async function rollbackQuietly(client: PoolClient) {
  try {
    await client.query("ROLLBACK");
  } catch {
    // Best effort cleanup; the client is released after this call.
  }
}

export function createNodePostgresQueryClient(connectionString: string): PostgresQueryClient {
  return {
    async health() {
      const pool = await getPool(connectionString);
      const result = await pool.query("SELECT 1 AS ok");
      if (result.rows[0]?.ok !== 1) {
        throw new Error("PostgreSQL health check returned an unexpected result.");
      }
    },

    async query(sql, params, options) {
      const pool = await getPool(connectionString);
      const client = await pool.connect();
      const timeoutMs = sanitizeTimeoutMs(options?.statementTimeoutMs);

      try {
        await client.query("BEGIN READ ONLY");
        await client.query(`SET LOCAL statement_timeout = '${timeoutMs}ms'`);
        const result = await client.query(sql, params);
        await client.query("COMMIT");

        return {
          rows: mapRows(result),
          fields: result.fields?.map((field) => ({ name: field.name })),
          rowCount: result.rowCount,
        };
      } catch (err) {
        await rollbackQuietly(client);
        throw err;
      } finally {
        client.release();
      }
    },

    async close() {
      if (sharedPool && sharedPoolConnectionString === connectionString) {
        await sharedPool.end();
        sharedPool = null;
        sharedPoolConnectionString = null;
      }
    },
  };
}
