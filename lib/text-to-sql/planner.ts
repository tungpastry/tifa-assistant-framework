import { getFinancialViewNames } from "@/lib/data-connectors/financial-views";
import type { QueryPlan, TextToSqlIntent, TextToSqlRequest } from "./types";
import { getViewsForIntent } from "./semantic-layer";

const SYMBOL_PATTERN = /\b[A-Z]{2,10}\b/g;

export function classifyIntent(question: string): TextToSqlIntent {
  const normalized = question.toLowerCase();

  if (normalized.includes("news") || normalized.includes("headline")) return "news_lookup";
  if (normalized.includes("sentiment")) return "sentiment_lookup";
  if (normalized.includes("macro") || normalized.includes("calendar") || normalized.includes("event")) return "macro_calendar";
  if (normalized.includes("return") || normalized.includes("volatility") || normalized.includes("daily")) return "symbol_stats";
  if (normalized.includes("price") || normalized.includes("ohlc") || normalized.includes("volume") || normalized.includes("bar")) return "market_lookup";

  return "unknown";
}

export function extractEntities(question: string) {
  return [...new Set(question.match(SYMBOL_PATTERN) ?? [])];
}

export function createQueryPlan(request: TextToSqlRequest): QueryPlan {
  const intent = classifyIntent(request.question);
  const allowedViews = request.allowedViews ?? getFinancialViewNames();
  const intentViews = getViewsForIntent(intent).filter((view) => allowedViews.includes(view));
  const entities = extractEntities(request.question);

  return {
    intent,
    entities,
    metrics: inferMetrics(intent),
    dimensions: inferDimensions(intent),
    filters: entities.length > 0
      ? [{ field: "symbol", operator: "in", value: entities }]
      : [],
    allowedViews: intentViews,
    limit: Math.min(request.maxRows ?? 100, 500),
    explanation: "Scaffolded QueryPlan generated from intent classification and allowlisted semantic views.",
  };
}

function inferMetrics(intent: TextToSqlIntent) {
  switch (intent) {
    case "market_lookup":
      return ["open", "high", "low", "close", "volume"];
    case "symbol_stats":
      return ["return_pct", "volatility", "volume"];
    case "sentiment_lookup":
      return ["sentiment_score", "sample_count"];
    default:
      return [];
  }
}

function inferDimensions(intent: TextToSqlIntent) {
  switch (intent) {
    case "news_lookup":
      return ["published_at", "source", "headline", "url"];
    case "macro_calendar":
      return ["event_time", "country", "event_name", "importance"];
    case "market_lookup":
      return ["symbol", "bar_time"];
    case "symbol_stats":
      return ["symbol", "trade_date"];
    case "sentiment_lookup":
      return ["symbol", "bucket_time"];
    default:
      return [];
  }
}

