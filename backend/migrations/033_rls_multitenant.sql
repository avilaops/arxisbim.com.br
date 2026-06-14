-- Migration 033: Row Level Security for all multi-tenant tables
-- "Regra de Ouro" S01: isolation enforced at DB level, not only application layer.
-- App role = 'app_user'; superuser bypasses RLS for migrations.

-- Create the application role if it doesn't exist yet
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user;
  END IF;
END $$;

-- Helper: set current tenant context (called by connection pool before queries)
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS TEXT AS $$
  SELECT NULLIF(current_setting('app.tenant_id', TRUE), '')
$$ LANGUAGE sql STABLE;

-- ============================================================
-- TENANTS table (base — no RLS needed, accessed by superuser)
-- ============================================================

-- ============================================================
-- USERS
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS users_tenant_isolation ON users;
CREATE POLICY users_tenant_isolation ON users
  USING (tenant_id = current_tenant_id());

-- ============================================================
-- AUDIT_LOGS
-- ============================================================
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS audit_logs_tenant_isolation ON audit_logs;
CREATE POLICY audit_logs_tenant_isolation ON audit_logs
  USING (tenant_id = current_tenant_id());

-- ============================================================
-- USER_SESSIONS
-- ============================================================
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_sessions_tenant_isolation ON user_sessions;
CREATE POLICY user_sessions_tenant_isolation ON user_sessions
  USING (tenant_id = current_tenant_id());

-- ============================================================
-- USER_PREFERENCES
-- ============================================================
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_preferences_tenant_isolation ON user_preferences;
CREATE POLICY user_preferences_tenant_isolation ON user_preferences
  USING (tenant_id = current_tenant_id());

-- ============================================================
-- AUTH_TOKENS
-- ============================================================
ALTER TABLE auth_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS auth_tokens_tenant_isolation ON auth_tokens;
CREATE POLICY auth_tokens_tenant_isolation ON auth_tokens
  USING (tenant_id = current_tenant_id());

-- ============================================================
-- PROJECTS
-- ============================================================
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS projects_tenant_isolation ON projects;
CREATE POLICY projects_tenant_isolation ON projects
  USING (tenant_id = current_tenant_id());

-- ============================================================
-- IFC_MODELS
-- ============================================================
ALTER TABLE ifc_models ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ifc_models_tenant_isolation ON ifc_models;
CREATE POLICY ifc_models_tenant_isolation ON ifc_models
  USING (tenant_id = current_tenant_id());

-- ============================================================
-- SCENARIOS
-- ============================================================
ALTER TABLE scenarios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS scenarios_tenant_isolation ON scenarios;
CREATE POLICY scenarios_tenant_isolation ON scenarios
  USING (tenant_id = current_tenant_id());

-- ============================================================
-- BIM_SCHEDULES
-- ============================================================
ALTER TABLE bim_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bim_schedules_tenant_isolation ON bim_schedules;
CREATE POLICY bim_schedules_tenant_isolation ON bim_schedules
  USING (
    project_id IN (
      SELECT id FROM projects WHERE tenant_id = current_tenant_id()
    )
  );

-- ============================================================
-- WEBHOOK_SUBSCRIPTIONS
-- ============================================================
ALTER TABLE webhook_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS webhook_subscriptions_tenant_isolation ON webhook_subscriptions;
CREATE POLICY webhook_subscriptions_tenant_isolation ON webhook_subscriptions
  USING (tenant_id = current_tenant_id());


-- ============================================================
-- NOTIFICATIONS
-- ============================================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS notifications_tenant_isolation ON notifications;
CREATE POLICY notifications_tenant_isolation ON notifications
  USING (tenant_id = current_tenant_id());

-- ============================================================
-- API_RATE_LIMITS
-- ============================================================
ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS api_rate_limits_tenant_isolation ON api_rate_limits;
CREATE POLICY api_rate_limits_tenant_isolation ON api_rate_limits
  USING (tenant_id = current_tenant_id());

-- ============================================================
-- METRICS
-- ============================================================
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS metrics_tenant_isolation ON metrics;
CREATE POLICY metrics_tenant_isolation ON metrics
  USING (tenant_id = current_tenant_id());

-- ============================================================
-- ERROR_LOGS
-- ============================================================
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS error_logs_tenant_isolation ON error_logs;
CREATE POLICY error_logs_tenant_isolation ON error_logs
  USING (tenant_id = current_tenant_id());

-- ============================================================
-- PERFORMANCE_METRICS
-- ============================================================
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS performance_metrics_tenant_isolation ON performance_metrics;
CREATE POLICY performance_metrics_tenant_isolation ON performance_metrics
  USING (tenant_id = current_tenant_id());

-- ============================================================
-- BILLING_SUBSCRIPTIONS
-- ============================================================
ALTER TABLE billing_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS billing_subscriptions_tenant_isolation ON billing_subscriptions;
CREATE POLICY billing_subscriptions_tenant_isolation ON billing_subscriptions
  USING (tenant_id = current_tenant_id());
