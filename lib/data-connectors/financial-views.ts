export interface FinancialViewDefinition {
  name: string;
  description: string;
  columns: Array<{
    name: string;
    type: string;
    description: string;
  }>;
}

export const FINANCIAL_VIEW_DEFINITIONS: FinancialViewDefinition[] = [
  {
    name: "v_market_bars",
    description: "OHLCV market bars by symbol and interval.",
    columns: [
      { name: "symbol", type: "text", description: "Ticker or instrument symbol." },
      { name: "bar_time", type: "timestamptz", description: "Bar timestamp." },
      { name: "open", type: "numeric", description: "Open price." },
      { name: "high", type: "numeric", description: "High price." },
      { name: "low", type: "numeric", description: "Low price." },
      { name: "close", type: "numeric", description: "Close price." },
      { name: "volume", type: "numeric", description: "Traded volume." },
    ],
  },
  {
    name: "v_latest_news",
    description: "Recent financial news and source metadata.",
    columns: [
      { name: "published_at", type: "timestamptz", description: "Publication timestamp." },
      { name: "source", type: "text", description: "News source." },
      { name: "headline", type: "text", description: "Headline text." },
      { name: "url", type: "text", description: "Canonical article URL." },
      { name: "symbols", type: "text[]", description: "Related symbols." },
    ],
  },
  {
    name: "v_symbol_daily_stats",
    description: "Daily return, volatility, and volume statistics by symbol.",
    columns: [
      { name: "symbol", type: "text", description: "Ticker or instrument symbol." },
      { name: "trade_date", type: "date", description: "Trading date." },
      { name: "return_pct", type: "numeric", description: "Daily return percentage." },
      { name: "volatility", type: "numeric", description: "Daily volatility estimate." },
      { name: "volume", type: "numeric", description: "Daily volume." },
    ],
  },
  {
    name: "v_macro_calendar",
    description: "Macroeconomic event calendar.",
    columns: [
      { name: "event_time", type: "timestamptz", description: "Event timestamp." },
      { name: "country", type: "text", description: "Country or region." },
      { name: "event_name", type: "text", description: "Event name." },
      { name: "importance", type: "text", description: "Importance bucket." },
    ],
  },
  {
    name: "v_sentiment_rollup",
    description: "Aggregated sentiment by symbol and time bucket.",
    columns: [
      { name: "symbol", type: "text", description: "Ticker or instrument symbol." },
      { name: "bucket_time", type: "timestamptz", description: "Aggregation timestamp." },
      { name: "sentiment_score", type: "numeric", description: "Normalized sentiment score." },
      { name: "sample_count", type: "integer", description: "Number of source items." },
    ],
  },
];

export function getFinancialViewNames() {
  return FINANCIAL_VIEW_DEFINITIONS.map((view) => view.name);
}

