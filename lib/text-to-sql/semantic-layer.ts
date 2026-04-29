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

export function getViewsForIntent(intent: string): string[] {
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

