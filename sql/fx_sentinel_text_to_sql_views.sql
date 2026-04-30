-- Fx-Sentinel read-only semantic views for Tifa Text-to-SQL.
-- Apply this manually in the fx-sentinel PostgreSQL database before enabling:
--   TIFA_TEXT_TO_SQL_ENABLED=1
--   TIFA_PG_ENABLED=1
--   TIFA_PG_ALLOWED_VIEWS=v_fx_market_snapshots,v_fx_latest_news,v_fx_symbol_daily_stats,v_fx_macro_calendar,v_fx_sentiment_rollup

CREATE OR REPLACE VIEW v_fx_market_snapshots AS
SELECT
  asset.symbol,
  snapshot.snapshot_time_utc AS bar_time,
  NULL::numeric AS open,
  NULL::numeric AS high,
  NULL::numeric AS low,
  asset.daily_close AS close,
  NULL::numeric AS volume,
  asset.daily_change_percent,
  asset.daily_pip_change,
  asset.provider_symbol,
  asset.bias_h1,
  asset.bias_h4,
  asset.bias_d1,
  asset.bias_w1,
  snapshot.provider,
  snapshot.market_day
FROM fx_pine_snapshot_assets asset
JOIN fx_pine_snapshots snapshot ON snapshot.id = asset.snapshot_id;

CREATE OR REPLACE VIEW v_fx_symbol_daily_stats AS
SELECT
  asset.symbol,
  snapshot.market_day AS trade_date,
  asset.daily_change_percent AS return_pct,
  NULL::numeric AS volatility,
  NULL::numeric AS volume,
  asset.daily_pip_change,
  asset.bias_d1,
  asset.bias_w1,
  snapshot.snapshot_time_utc AS observed_at
FROM fx_pine_snapshot_assets asset
JOIN fx_pine_snapshots snapshot ON snapshot.id = asset.snapshot_id;

CREATE OR REPLACE VIEW v_fx_latest_news AS
SELECT
  report.report_time_utc AS published_at,
  COALESCE(driver.item ->> 'source', report.model_name, 'fx-sentinel') AS source,
  COALESCE(driver.item ->> 'headline', driver.item ->> 'summary', left(report.raw_markdown, 240)) AS headline,
  NULL::text AS url,
  CASE
    WHEN COALESCE(driver.item ->> 'pairs', '') = '' THEN ARRAY[]::text[]
    ELSE regexp_split_to_array(driver.item ->> 'pairs', '\s*;\s*')
  END AS symbols,
  driver.item ->> 'impact' AS impact,
  driver.item ->> 'confidence' AS confidence,
  report.id AS report_id
FROM fx_reports report
LEFT JOIN LATERAL jsonb_array_elements(COALESCE(report.top_drivers, '[]'::jsonb)) AS driver(item) ON true;

CREATE OR REPLACE VIEW v_fx_macro_calendar AS
SELECT
  report.report_time_utc AS event_time,
  COALESCE(event.item ->> 'country', event.item ->> 'region') AS country,
  COALESCE(event.item ->> 'event_name', event.item ->> 'summary', event.item ->> 'name') AS event_name,
  COALESCE(event.item ->> 'importance', event.item ->> 'impact') AS importance,
  CASE
    WHEN COALESCE(event.item ->> 'pairs', '') = '' THEN ARRAY[]::text[]
    ELSE regexp_split_to_array(event.item ->> 'pairs', '\s*;\s*')
  END AS symbols,
  report.id AS report_id
FROM fx_reports report
LEFT JOIN LATERAL jsonb_array_elements(COALESCE(report.upcoming_events, '[]'::jsonb)) AS event(item) ON true;

CREATE OR REPLACE VIEW v_fx_sentiment_rollup AS
SELECT
  'MARKET'::text AS symbol,
  report.report_time_utc AS bucket_time,
  CASE
    WHEN (report.sentiment ->> 'score') ~ '^-?[0-9]+(\.[0-9]+)?$'
      THEN (report.sentiment ->> 'score')::numeric
    ELSE NULL::numeric
  END AS sentiment_score,
  1::integer AS sample_count,
  COALESCE(report.sentiment ->> 'summary', report.sentiment ->> 'label') AS summary,
  COALESCE(report.sentiment ->> 'source', report.model_name, 'fx-sentinel') AS source,
  report.id AS report_id
FROM fx_reports report
WHERE report.sentiment IS NOT NULL;
