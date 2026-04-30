import { FINANCIAL_VIEW_DEFINITIONS, getFinancialViewNames } from "@/lib/data-connectors/financial-views";
import type { FinancialViewDefinition } from "@/lib/data-connectors/financial-views";

export interface SemanticLayerContext {
  views: FinancialViewDefinition[];
  allowedViews: string[];
}

export function getDefaultSemanticLayer(allowedViews = getFinancialViewNames()): SemanticLayerContext {
  const allowed = new Set(allowedViews);

  return {
    allowedViews,
    views: FINANCIAL_VIEW_DEFINITIONS.filter((view) => allowed.has(view.name)),
  };
}

const INTENT_VIEW_PRIORITY: Record<string, string[]> = {
  market_lookup: ["v_fx_market_snapshots", "v_market_bars"],
  news_lookup: ["v_fx_latest_news", "v_latest_news"],
  symbol_stats: ["v_fx_symbol_daily_stats", "v_symbol_daily_stats"],
  macro_calendar: ["v_fx_macro_calendar", "v_macro_calendar"],
  sentiment_lookup: ["v_fx_sentiment_rollup", "v_sentiment_rollup"],
};

export function getViewsForIntent(intent: string, allowedViews = getFinancialViewNames()): string[] {
  const allowed = new Set(allowedViews);
  const priority = INTENT_VIEW_PRIORITY[intent] ?? [];
  return priority.filter((view) => allowed.has(view));
}

export function getPrimaryViewForIntent(intent: string, allowedViews = getFinancialViewNames()): string | null {
  return getViewsForIntent(intent, allowedViews)[0] ?? null;
}

export function getLegacyViewsForIntent(intent: string): string[] {
  switch (intent) {
    case "market_lookup":
      return ["v_market_bars"];
    case "news_lookup":
      return ["v_latest_news"];
    case "symbol_stats":
      return ["v_symbol_daily_stats"];
    case "macro_calendar":
      return ["v_macro_calendar"];
    case "sentiment_lookup":
      return ["v_sentiment_rollup"];
    default:
      return [];
  }
}
