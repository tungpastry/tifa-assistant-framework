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
  {
    name: "v_fx_market_snapshots",
    description: "Fx-Sentinel latest TradingView/OANDA market snapshots normalized for price lookups.",
    columns: [
      { name: "symbol", type: "text", description: "Forex or metal pair such as EUR/USD or XAU/USD." },
      { name: "bar_time", type: "timestamptz", description: "Snapshot timestamp." },
      { name: "open", type: "numeric", description: "Reserved OHLC-compatible open price; currently null for snapshot rows." },
      { name: "high", type: "numeric", description: "Reserved OHLC-compatible high price; currently null for snapshot rows." },
      { name: "low", type: "numeric", description: "Reserved OHLC-compatible low price; currently null for snapshot rows." },
      { name: "close", type: "numeric", description: "Latest daily close from the snapshot asset." },
      { name: "volume", type: "numeric", description: "Reserved OHLC-compatible volume; currently null for FX snapshots." },
      { name: "daily_change_percent", type: "numeric", description: "Daily percentage change." },
      { name: "bias_h1", type: "text", description: "Hourly trend bias." },
      { name: "bias_h4", type: "text", description: "Four-hour trend bias." },
      { name: "bias_d1", type: "text", description: "Daily trend bias." },
      { name: "bias_w1", type: "text", description: "Weekly trend bias." },
    ],
  },
  {
    name: "v_fx_latest_news",
    description: "Fx-Sentinel latest report drivers and source metadata for headline/news lookups.",
    columns: [
      { name: "published_at", type: "timestamptz", description: "Report timestamp." },
      { name: "source", type: "text", description: "Driver source or report model/source metadata." },
      { name: "headline", type: "text", description: "Top-driver headline or latest report summary." },
      { name: "url", type: "text", description: "Reserved URL field; currently null for generated reports." },
      { name: "symbols", type: "text[]", description: "Related FX symbols parsed from the driver pairs field." },
      { name: "impact", type: "text", description: "Driver impact bucket when available." },
      { name: "confidence", type: "text", description: "Driver confidence bucket when available." },
    ],
  },
  {
    name: "v_fx_symbol_daily_stats",
    description: "Fx-Sentinel daily return and trend statistics from Pine/OANDA snapshots.",
    columns: [
      { name: "symbol", type: "text", description: "Forex or metal pair." },
      { name: "trade_date", type: "date", description: "Market day." },
      { name: "return_pct", type: "numeric", description: "Daily return percentage." },
      { name: "volatility", type: "numeric", description: "Reserved volatility field; currently null." },
      { name: "volume", type: "numeric", description: "Reserved volume field; currently null." },
      { name: "daily_pip_change", type: "numeric", description: "Daily pip change." },
      { name: "bias_d1", type: "text", description: "Daily trend bias." },
    ],
  },
  {
    name: "v_fx_macro_calendar",
    description: "Fx-Sentinel upcoming macro events extracted from latest reports.",
    columns: [
      { name: "event_time", type: "timestamptz", description: "Report timestamp when structured event time is unavailable." },
      { name: "country", type: "text", description: "Country or region when available." },
      { name: "event_name", type: "text", description: "Macro event name or summary." },
      { name: "importance", type: "text", description: "Impact or importance bucket." },
      { name: "symbols", type: "text[]", description: "Related FX symbols." },
    ],
  },
  {
    name: "v_fx_sentiment_rollup",
    description: "Fx-Sentinel report-level sentiment normalized for sentiment lookup queries.",
    columns: [
      { name: "symbol", type: "text", description: "Related FX symbol when sentiment is pair-specific, otherwise MARKET." },
      { name: "bucket_time", type: "timestamptz", description: "Report timestamp." },
      { name: "sentiment_score", type: "numeric", description: "Numeric sentiment score when available." },
      { name: "sample_count", type: "integer", description: "Number of reports represented." },
      { name: "summary", type: "text", description: "Sentiment summary text." },
      { name: "source", type: "text", description: "Sentiment source." },
    ],
  },
];

export function getFinancialViewNames() {
  return FINANCIAL_VIEW_DEFINITIONS.map((view) => view.name);
}
