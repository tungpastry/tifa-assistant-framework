-- Draft PostgreSQL RLS policies for Tifa Assistant Framework SaaS mode.
-- Do not apply automatically in local mode.

ALTER TABLE assistant_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistant_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE connectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_assistant_sessions
  ON assistant_sessions
  USING (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_assistant_messages
  ON assistant_messages
  USING (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_tool_calls
  ON tool_calls
  USING (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_usage_events
  ON usage_events
  USING (tenant_id::text = current_setting('app.tenant_id', true));

-- Repeat tenant isolation policies for each tenant-owned table before enabling
-- strict production SaaS mode. Migrations should also set app.tenant_id inside
-- each request transaction.

