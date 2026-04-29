import type { DataConnectorContext, DataQueryResult } from "@/lib/data-connectors/types";

export type TextToSqlIntent =
  | "market_lookup"
  | "news_lookup"
  | "symbol_stats"
  | "macro_calendar"
  | "sentiment_lookup"
  | "unknown";

export interface QueryPlan {
  intent: TextToSqlIntent;
  entities: string[];
  timeframe?: {
    start?: string;
    end?: string;
    label?: string;
  };
  metrics: string[];
  dimensions: string[];
  filters: Array<{
    field: string;
    operator: "=" | "!=" | ">" | ">=" | "<" | "<=" | "in" | "between";
    value: string | number | boolean | Array<string | number>;
  }>;
  allowedViews: string[];
  limit: number;
  explanation: string;
}

export interface TextToSqlRequest {
  question: string;
  context: DataConnectorContext;
  allowedViews?: string[];
  maxRows?: number;
}

export interface TextToSqlValidationResult {
  allowed: boolean;
  sql?: string;
  reasons: string[];
  warnings: string[];
  plan: QueryPlan;
}

export interface TextToSqlExecutionResult {
  plan: QueryPlan;
  sql: string;
  data: DataQueryResult;
  evidence: Array<{
    source: string;
    rowCount: number;
    columns: string[];
  }>;
}

