-- =====================================
-- Migration 010: Billing & Subscriptions
-- =====================================
-- Adiciona infraestrutura de billing multi-tenant para planos,
-- checkout interno/provider-ready, invoices e eventos de uso.
-- =====================================

CREATE TABLE IF NOT EXISTS billing_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(255) NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  plan VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  billing_cycle VARCHAR(20) DEFAULT 'monthly' NOT NULL,
  currency VARCHAR(3) DEFAULT 'BRL' NOT NULL,
  amount_cents INTEGER DEFAULT 0 NOT NULL,
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  trial_ends_at TIMESTAMP,
  cancel_at_period_end BOOLEAN DEFAULT FALSE NOT NULL,
  provider VARCHAR(50) DEFAULT 'internal' NOT NULL,
  provider_customer_id VARCHAR(255),
  provider_subscription_id VARCHAR(255),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS billing_subscriptions_tenant_id_unique_idx ON billing_subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS billing_subscriptions_tenant_id_idx ON billing_subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS billing_subscriptions_status_idx ON billing_subscriptions(status);
CREATE INDEX IF NOT EXISTS billing_subscriptions_provider_subscription_idx ON billing_subscriptions(provider_subscription_id);

CREATE TABLE IF NOT EXISTS billing_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(255) NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES billing_subscriptions(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'draft' NOT NULL,
  currency VARCHAR(3) DEFAULT 'BRL' NOT NULL,
  subtotal_cents INTEGER DEFAULT 0 NOT NULL,
  tax_cents INTEGER DEFAULT 0 NOT NULL,
  total_cents INTEGER DEFAULT 0 NOT NULL,
  due_at TIMESTAMP,
  paid_at TIMESTAMP,
  provider_invoice_id VARCHAR(255),
  hosted_invoice_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS billing_invoices_tenant_id_idx ON billing_invoices(tenant_id);
CREATE INDEX IF NOT EXISTS billing_invoices_subscription_id_idx ON billing_invoices(subscription_id);
CREATE INDEX IF NOT EXISTS billing_invoices_status_idx ON billing_invoices(status);

CREATE TABLE IF NOT EXISTS billing_checkout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(255) NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  requested_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  plan VARCHAR(50) NOT NULL,
  billing_cycle VARCHAR(20) DEFAULT 'monthly' NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' NOT NULL,
  provider VARCHAR(50) DEFAULT 'internal' NOT NULL,
  provider_session_id VARCHAR(255),
  checkout_url TEXT,
  success_url TEXT,
  cancel_url TEXT,
  amount_cents INTEGER DEFAULT 0 NOT NULL,
  currency VARCHAR(3) DEFAULT 'BRL' NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS billing_checkout_sessions_tenant_id_idx ON billing_checkout_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS billing_checkout_sessions_status_idx ON billing_checkout_sessions(status);
CREATE INDEX IF NOT EXISTS billing_checkout_sessions_provider_session_idx ON billing_checkout_sessions(provider_session_id);

CREATE TABLE IF NOT EXISTS billing_usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(255) NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  metric VARCHAR(100) NOT NULL,
  quantity INTEGER DEFAULT 1 NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  recorded_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS billing_usage_events_tenant_metric_idx ON billing_usage_events(tenant_id, metric);
CREATE INDEX IF NOT EXISTS billing_usage_events_recorded_at_idx ON billing_usage_events(recorded_at);

COMMENT ON TABLE billing_subscriptions IS 'Tenant billing subscription state and provider mapping';
COMMENT ON TABLE billing_invoices IS 'Billing invoices created internally or synchronized from provider';
COMMENT ON TABLE billing_checkout_sessions IS 'Checkout sessions for plan upgrades/downgrades';
COMMENT ON TABLE billing_usage_events IS 'Usage metrics that feed quotas, invoices, and analytics';
