import { getFinancialViewNames } from "@/lib/data-connectors/financial-views";
import type { QueryPlan, TextToSqlIntent, TextToSqlRequest } from "./types";
import { getViewsForIntent } from "./semantic-layer";

const SYMBOL_PATTERN = /\b[A-Z]{2,10}\b/g;
const FX_PAIR_PATTERN = /\b([A-Z]{3})[\/_-]?([A-Z]{3})\b/g;

export function classifyIntent(question: string): TextToSqlIntent {
  const normalized = question.toLowerCase();

  if (normalized.includes("news") || normalized.includes("headline") || normalized.includes("driver")) return "news_lookup";
  if (normalized.includes("sentiment")) return "sentiment_lookup";
  if (normalized.includes("macro") || normalized.includes("calendar") || normalized.includes("event")) return "macro_calendar";
  if (normalized.includes("return") || normalized.includes("volatility") || normalized.includes("daily") || normalized.includes("pip")) return "symbol_stats";
  if (normalized.includes("price") || normalized.includes("ohlc") || normalized.includes("volume") || normalized.includes("bar") || normalized.includes("snapshot")) return "market_lookup";

  return "unknown";
}

export function extractEntities(question: string) {
  const entities = new Set<string>();
  let hasFxPair = false;
  let pairMatch = FX_PAIR_PATTERN.exec(question);

  while (pairMatch) {
    hasFxPair = true;
    const base = pairMatch[1];
    const quote = pairMatch[2];
    entities.add(`${base}/${quote}`);
    entities.add(`${base}${quote}`);
    pairMatch = FX_PAIR_PATTERN.exec(question);
  }

  for (const symbol of question.match(SYMBOL_PATTERN) ?? []) {
    if (hasFxPair && /^[A-Z]{3}$/.test(symbol)) continue;
    entities.add(symbol);
  }

  return [...entities];
}

export function createQueryPlan(request: TextToSqlRequest): QueryPlan {
  const intent = classifyIntent(request.question);
  const allowedViews = request.allowedViews ?? getFinancialViewNames();
  const intentViews = getViewsForIntent(intent, allowedViews);
  const entities = extractEntities(request.question);

  return {
    intent,
    entities,
    metrics: inferMetrics(intent),
    dimensions: inferDimensions(intent),
    filters: entities.length > 0 && ["market_lookup", "symbol_stats", "sentiment_lookup"].includes(intent)
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
