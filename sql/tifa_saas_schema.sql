-- Tifa Assistant Framework SaaS schema draft.
-- This file is a planning scaffold. It is not applied by local mode.

CREATE TABLE tenants (
  id uuid PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  plan_code text NOT NULL,
  status text NOT NULL CHECK (status IN ('active', 'suspended', 'deleted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE,
  display_name text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE tenant_memberships (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  user_id uuid NOT NULL REFERENCES users(id),
  role text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id)
);

CREATE TABLE assistants (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  slug text NOT NULL,
  name text NOT NULL,
  locale text NOT NULL DEFAULT 'en-US',
  default_mood text NOT NULL DEFAULT 'focused',
  model_policy jsonb NOT NULL DEFAULT '{}'::jsonb,
  tool_policy jsonb NOT NULL DEFAULT '{}'::jsonb,
  voice_policy jsonb NOT NULL DEFAULT '{}'::jsonb,
  ui_policy jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, slug)
);

CREATE TABLE assistant_sessions (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  assistant_id uuid NOT NULL REFERENCES assistants(id),
  user_id uuid REFERENCES users(id),
  channel text NOT NULL,
  locale text NOT NULL,
  mood text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE assistant_messages (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  session_id uuid NOT NULL REFERENCES assistant_sessions(id),
  role text NOT NULL CHECK (role IN ('system', 'user', 'assistant', 'tool')),
  content text NOT NULL,
  content_json jsonb,
  provider text,
  model text,
  usage jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE connectors (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  name text NOT NULL,
  connector_type text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'disabled',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
);

CREATE TABLE provider_keys (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  provider text NOT NULL,
  display_name text NOT NULL,
  secret_ref text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  last_rotated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE api_keys (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  name text NOT NULL,
  secret_hash text NOT NULL,
  scopes text[] NOT NULL DEFAULT ARRAY[]::text[],
  status text NOT NULL DEFAULT 'active',
  last_used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE tool_calls (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  session_id uuid NOT NULL REFERENCES assistant_sessions(id),
  message_id uuid REFERENCES assistant_messages(id),
  tool_name text NOT NULL,
  input jsonb NOT NULL DEFAULT '{}'::jsonb,
  output jsonb,
  status text NOT NULL,
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE model_runs (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  assistant_id uuid REFERENCES assistants(id),
  session_id uuid REFERENCES assistant_sessions(id),
  provider text NOT NULL,
  model text NOT NULL,
  status text NOT NULL,
  input_tokens integer,
  output_tokens integer,
  total_tokens integer,
  latency_ms integer,
  estimated_cost_usd numeric(12, 6),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE voice_assets (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  provider text NOT NULL,
  voice_id text NOT NULL,
  model_id text,
  storage_url text NOT NULL,
  content_type text NOT NULL,
  byte_size bigint,
  license_class text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE voice_jobs (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  session_id uuid REFERENCES assistant_sessions(id),
  provider text NOT NULL,
  voice_id text NOT NULL,
  model_id text,
  input_text_hash text NOT NULL,
  asset_id uuid REFERENCES voice_assets(id),
  status text NOT NULL,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE usage_events (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  assistant_id uuid REFERENCES assistants(id),
  session_id uuid REFERENCES assistant_sessions(id),
  meter text NOT NULL,
  quantity numeric NOT NULL,
  unit text NOT NULL,
  provider text,
  model text,
  estimated_cost_usd numeric(12, 6),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE billing_accounts (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL UNIQUE REFERENCES tenants(id),
  billing_provider text,
  billing_customer_ref text,
  status text NOT NULL DEFAULT 'inactive',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE audit_events (
  id uuid PRIMARY KEY,
  tenant_id uuid REFERENCES tenants(id),
  actor_user_id uuid REFERENCES users(id),
  event_type text NOT NULL,
  resource_type text,
  resource_id text,
  ip_address inet,
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tenant_memberships_tenant_user ON tenant_memberships (tenant_id, user_id);
CREATE INDEX idx_assistants_tenant ON assistants (tenant_id);
CREATE INDEX idx_sessions_tenant_created ON assistant_sessions (tenant_id, created_at DESC);
CREATE INDEX idx_sessions_assistant_created ON assistant_sessions (assistant_id, created_at DESC);
CREATE INDEX idx_messages_session_created ON assistant_messages (session_id, created_at);
CREATE INDEX idx_messages_tenant_created ON assistant_messages (tenant_id, created_at DESC);
CREATE INDEX idx_connectors_tenant ON connectors (tenant_id);
CREATE INDEX idx_provider_keys_tenant_provider ON provider_keys (tenant_id, provider);
CREATE INDEX idx_api_keys_tenant ON api_keys (tenant_id);
CREATE INDEX idx_tool_calls_session_created ON tool_calls (session_id, created_at DESC);
CREATE INDEX idx_model_runs_tenant_created ON model_runs (tenant_id, created_at DESC);
CREATE INDEX idx_voice_assets_tenant_created ON voice_assets (tenant_id, created_at DESC);
CREATE INDEX idx_voice_jobs_tenant_status ON voice_jobs (tenant_id, status, created_at DESC);
CREATE INDEX idx_usage_events_tenant_meter_created ON usage_events (tenant_id, meter, created_at DESC);
CREATE INDEX idx_audit_events_tenant_created ON audit_events (tenant_id, created_at DESC);

-- SaaS deployments should enable PostgreSQL Row Level Security on tenant-owned tables
-- and set the current tenant context in the database session before queries.
-- Example:
--   ALTER TABLE assistant_sessions ENABLE ROW LEVEL SECURITY;
--   CREATE POLICY tenant_isolation ON assistant_sessions
--     USING (tenant_id::text = current_setting('app.tenant_id', true));
