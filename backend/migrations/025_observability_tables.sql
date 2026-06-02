-- Migration 025: Create observability tables missing from production DB
-- audit_logs, user_preferences, metrics, api_rate_limits, error_logs, performance_metrics
-- Also adds missing columns to user_sessions

-- =============================================
-- user_sessions: add missing columns
-- =============================================
ALTER TABLE user_sessions
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS access_token_jti varchar(255),
  ADD COLUMN IF NOT EXISTS user_agent text;

-- =============================================
-- audit_logs
-- =============================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id varchar(255) NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  user_id uuid,
  action varchar(100) NOT NULL,
  resource varchar(100) NOT NULL,
  resource_id varchar(255),
  metadata jsonb,
  timestamp timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_logs_tenant_id_timestamp_idx ON audit_logs (tenant_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS audit_logs_user_id_timestamp_idx ON audit_logs (user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS audit_logs_action_timestamp_idx ON audit_logs (action, timestamp DESC);
CREATE INDEX IF NOT EXISTS audit_logs_resource_id_idx ON audit_logs (resource_id);
CREATE INDEX IF NOT EXISTS audit_logs_timestamp_idx ON audit_logs (timestamp DESC);

-- =============================================
-- user_preferences
-- =============================================
CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  tenant_id varchar(255) NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  theme varchar(20) DEFAULT 'dark',
  language varchar(10) DEFAULT 'pt-BR',
  notifications jsonb DEFAULT '{"email":true,"push":true,"inApp":true}',
  vr_settings jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS user_preferences_user_id_idx ON user_preferences (user_id);
CREATE INDEX IF NOT EXISTS user_preferences_tenant_id_idx ON user_preferences (tenant_id);

-- =============================================
-- metrics
-- =============================================
CREATE TABLE IF NOT EXISTS metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id varchar(255) NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  metric_name varchar(100) NOT NULL,
  metric_type varchar(50) NOT NULL,
  value bigint NOT NULL,
  labels jsonb,
  timestamp timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS metrics_tenant_metric_timestamp_idx ON metrics (tenant_id, metric_name, timestamp DESC);
CREATE INDEX IF NOT EXISTS metrics_metric_name_timestamp_idx ON metrics (metric_name, timestamp DESC);
CREATE INDEX IF NOT EXISTS metrics_timestamp_idx ON metrics (timestamp DESC);
CREATE INDEX IF NOT EXISTS metrics_tenant_metric_type_idx ON metrics (tenant_id, metric_name, metric_type);

-- =============================================
-- api_rate_limits
-- =============================================
CREATE TABLE IF NOT EXISTS api_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id varchar(255) NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  user_id uuid,
  identifier varchar(255) NOT NULL,
  endpoint varchar(255) NOT NULL,
  request_count integer NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL,
  window_end timestamptz NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS api_rate_limits_identifier_endpoint_window_idx ON api_rate_limits (identifier, endpoint, window_start);
CREATE INDEX IF NOT EXISTS api_rate_limits_tenant_id_idx ON api_rate_limits (tenant_id);
CREATE INDEX IF NOT EXISTS api_rate_limits_window_end_idx ON api_rate_limits (window_end);

-- =============================================
-- error_logs
-- =============================================
CREATE TABLE IF NOT EXISTS error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id varchar(255) REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  user_id uuid,
  error_code varchar(50),
  error_message text NOT NULL,
  stack_trace text,
  context jsonb,
  severity varchar(20) NOT NULL DEFAULT 'error',
  resolved boolean DEFAULT false,
  resolved_at timestamptz,
  timestamp timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS error_logs_tenant_id_timestamp_idx ON error_logs (tenant_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS error_logs_severity_timestamp_idx ON error_logs (severity, timestamp DESC);
CREATE INDEX IF NOT EXISTS error_logs_resolved_idx ON error_logs (resolved);
CREATE INDEX IF NOT EXISTS error_logs_timestamp_idx ON error_logs (timestamp DESC);

-- =============================================
-- performance_metrics
-- =============================================
CREATE TABLE IF NOT EXISTS performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id varchar(255) NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  user_id uuid,
  operation varchar(100) NOT NULL,
  duration integer NOT NULL,
  metadata jsonb,
  timestamp timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS performance_metrics_operation_timestamp_idx ON performance_metrics (operation, timestamp DESC);
CREATE INDEX IF NOT EXISTS performance_metrics_tenant_id_timestamp_idx ON performance_metrics (tenant_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS performance_metrics_duration_idx ON performance_metrics (duration DESC);
CREATE INDEX IF NOT EXISTS performance_metrics_timestamp_idx ON performance_metrics (timestamp DESC);
