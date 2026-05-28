-- =====================================
-- MIGRATION: Observabilidade e Otimizações para 10k+ usuários
-- Data: 2026-05-05
-- =====================================

BEGIN;

-- ========== AUDIT_LOGS ==========
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(255) NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  user_id UUID,
  action VARCHAR(100) NOT NULL,
  resource VARCHAR(100) NOT NULL,
  resource_id VARCHAR(255),
  metadata JSONB,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_logs_tenant_id_timestamp_idx ON audit_logs(tenant_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS audit_logs_user_id_timestamp_idx ON audit_logs(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS audit_logs_action_timestamp_idx ON audit_logs(action, timestamp DESC);
CREATE INDEX IF NOT EXISTS audit_logs_resource_timestamp_idx ON audit_logs(resource, timestamp DESC);
CREATE INDEX IF NOT EXISTS audit_logs_resource_id_idx ON audit_logs(resource_id);
CREATE INDEX IF NOT EXISTS audit_logs_timestamp_idx ON audit_logs(timestamp DESC);

-- ========== USER_SESSIONS ==========
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tenant_id VARCHAR(255) NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  refresh_token TEXT NOT NULL UNIQUE,
  device_info JSONB,
  expires_at TIMESTAMP NOT NULL,
  last_activity_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS user_sessions_user_id_idx ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS user_sessions_tenant_id_idx ON user_sessions(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS user_sessions_refresh_token_idx ON user_sessions(refresh_token);
CREATE INDEX IF NOT EXISTS user_sessions_expires_at_idx ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS user_sessions_user_active_idx ON user_sessions(user_id, revoked_at, expires_at);

-- ========== USER_PREFERENCES ==========
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  tenant_id VARCHAR(255) NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  theme VARCHAR(20) DEFAULT 'dark',
  language VARCHAR(10) DEFAULT 'pt-BR',
  notifications JSONB DEFAULT '{"email": true, "push": true, "inApp": true}',
  vr_settings JSONB,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS user_preferences_user_id_idx ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS user_preferences_tenant_id_idx ON user_preferences(tenant_id);

-- ========== METRICS ==========
CREATE TABLE IF NOT EXISTS metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(255) NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  metric_name VARCHAR(100) NOT NULL,
  metric_type VARCHAR(50) NOT NULL,
  value BIGINT NOT NULL,
  labels JSONB,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS metrics_tenant_metric_timestamp_idx ON metrics(tenant_id, metric_name, timestamp DESC);
CREATE INDEX IF NOT EXISTS metrics_metric_name_timestamp_idx ON metrics(metric_name, timestamp DESC);
CREATE INDEX IF NOT EXISTS metrics_timestamp_idx ON metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS metrics_tenant_metric_type_idx ON metrics(tenant_id, metric_name, metric_type);

-- ========== API_RATE_LIMITS ==========
CREATE TABLE IF NOT EXISTS api_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(255) NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  user_id UUID,
  identifier VARCHAR(255) NOT NULL,
  endpoint VARCHAR(255) NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMP NOT NULL,
  window_end TIMESTAMP NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS api_rate_limits_identifier_endpoint_window_idx ON api_rate_limits(identifier, endpoint, window_start);
CREATE INDEX IF NOT EXISTS api_rate_limits_tenant_id_idx ON api_rate_limits(tenant_id);
CREATE INDEX IF NOT EXISTS api_rate_limits_window_end_idx ON api_rate_limits(window_end);

-- ========== ERROR_LOGS ==========
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(255) REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  user_id UUID,
  error_code VARCHAR(50),
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  context JSONB,
  severity VARCHAR(20) NOT NULL DEFAULT 'error',
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS error_logs_tenant_id_timestamp_idx ON error_logs(tenant_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS error_logs_error_code_timestamp_idx ON error_logs(error_code, timestamp DESC);
CREATE INDEX IF NOT EXISTS error_logs_severity_timestamp_idx ON error_logs(severity, timestamp DESC);
CREATE INDEX IF NOT EXISTS error_logs_resolved_idx ON error_logs(resolved);
CREATE INDEX IF NOT EXISTS error_logs_timestamp_idx ON error_logs(timestamp DESC);

-- ========== PERFORMANCE_METRICS ==========
CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(255) NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  user_id UUID,
  operation VARCHAR(100) NOT NULL,
  duration INTEGER NOT NULL,
  metadata JSONB,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS performance_metrics_operation_timestamp_idx ON performance_metrics(operation, timestamp DESC);
CREATE INDEX IF NOT EXISTS performance_metrics_tenant_id_timestamp_idx ON performance_metrics(tenant_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS performance_metrics_duration_idx ON performance_metrics(duration DESC);
CREATE INDEX IF NOT EXISTS performance_metrics_timestamp_idx ON performance_metrics(timestamp DESC);

-- ========== OTIMIZAÇÕES NA TABELA USERS ==========
-- Adicionar novos indexes compostos para melhor performance
DROP INDEX IF EXISTS users_tenant_id_idx;
DROP INDEX IF EXISTS users_company_id_idx;

CREATE INDEX IF NOT EXISTS users_tenant_id_email_idx ON users(tenant_id, email);
CREATE INDEX IF NOT EXISTS users_tenant_id_active_idx ON users(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS users_company_id_idx ON users(company_id);
CREATE INDEX IF NOT EXISTS users_last_login_at_idx ON users(last_login_at DESC);
CREATE INDEX IF NOT EXISTS users_auth_idx ON users(tenant_id, email, is_active);

-- ========== CONFIGURAÇÕES DE PERFORMANCE ==========
-- Configurar autovacuum mais agressivo para tabelas com alto volume
ALTER TABLE audit_logs SET (autovacuum_vacuum_scale_factor = 0.01);
ALTER TABLE metrics SET (autovacuum_vacuum_scale_factor = 0.01);
ALTER TABLE performance_metrics SET (autovacuum_vacuum_scale_factor = 0.01);

-- Configurar fillfactor para tabelas com muitas inserções
ALTER TABLE audit_logs SET (fillfactor = 90);
ALTER TABLE metrics SET (fillfactor = 90);
ALTER TABLE performance_metrics SET (fillfactor = 90);

-- ========== VIEWS PARA ANÁLISE ==========
CREATE OR REPLACE VIEW v_active_users_by_tenant AS
SELECT 
  tenant_id,
  COUNT(*) as active_users,
  COUNT(*) FILTER (WHERE last_login_at > NOW() - INTERVAL '7 days') as active_last_7_days,
  COUNT(*) FILTER (WHERE last_login_at > NOW() - INTERVAL '30 days') as active_last_30_days
FROM users
WHERE is_active = TRUE
GROUP BY tenant_id;

CREATE OR REPLACE VIEW v_api_performance_summary AS
SELECT 
  tenant_id,
  operation,
  COUNT(*) as total_requests,
  AVG(duration) as avg_duration_ms,
  MIN(duration) as min_duration_ms,
  MAX(duration) as max_duration_ms,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration) as p50_duration_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration) as p95_duration_ms,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY duration) as p99_duration_ms
FROM performance_metrics
WHERE timestamp > NOW() - INTERVAL '1 hour'
GROUP BY tenant_id, operation;

CREATE OR REPLACE VIEW v_error_summary AS
SELECT 
  tenant_id,
  severity,
  error_code,
  COUNT(*) as error_count,
  COUNT(*) FILTER (WHERE resolved = FALSE) as unresolved_count,
  MAX(timestamp) as last_occurred
FROM error_logs
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY tenant_id, severity, error_code
ORDER BY error_count DESC;

COMMIT;

-- =====================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- =====================================

COMMENT ON TABLE audit_logs IS 'Registro de todas as ações dos usuários para auditoria e compliance';
COMMENT ON TABLE user_sessions IS 'Gestão de sessões de usuários com tokens de refresh';
COMMENT ON TABLE user_preferences IS 'Preferências e configurações personalizadas por usuário';
COMMENT ON TABLE metrics IS 'Métricas de aplicação para observabilidade e monitoramento';
COMMENT ON TABLE api_rate_limits IS 'Controle de rate limiting por usuário/IP e endpoint';
COMMENT ON TABLE error_logs IS 'Registro centralizado de erros da aplicação';
COMMENT ON TABLE performance_metrics IS 'Métricas de performance de operações críticas';

-- =====================================
-- SUCESSO
-- =====================================
SELECT 'Migration completed successfully!' as message;
