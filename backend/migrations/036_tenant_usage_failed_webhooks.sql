-- S04: tenant_usage counters + failed_webhooks dead-letter queue

-- Contadores de uso por tenant (evita COUNT queries a cada verificação de limite)
CREATE TABLE IF NOT EXISTS tenant_usage (
  tenant_id VARCHAR(255) PRIMARY KEY REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  projects_count INT DEFAULT 0 NOT NULL,
  storage_bytes BIGINT DEFAULT 0 NOT NULL,
  users_count INT DEFAULT 0 NOT NULL,
  scenarios_count INT DEFAULT 0 NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tenant_usage_updated_at ON tenant_usage(updated_at);

-- Dead-letter queue para webhooks Stripe que falharam ao processar
CREATE TABLE IF NOT EXISTS failed_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id VARCHAR(255) NOT NULL,
  payload JSONB NOT NULL,
  error TEXT,
  attempts INT DEFAULT 0 NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_failed_webhooks_event_id ON failed_webhooks(event_id);
CREATE INDEX IF NOT EXISTS idx_failed_webhooks_created_at ON failed_webhooks(created_at);

