-- =====================================
-- Migration 022: Stripe Events, Entitlements and Payments
-- =====================================
-- Harden billing for production SaaS:
-- - webhook idempotency/audit
-- - entitlement-based authorization source
-- - normalized payment history
-- - seats and provider price mapping support
-- =====================================

ALTER TABLE billing_subscriptions
  ADD COLUMN IF NOT EXISTS provider_price_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS seat_count INTEGER DEFAULT 1 NOT NULL,
  ADD COLUMN IF NOT EXISTS max_seats INTEGER DEFAULT 1 NOT NULL;

CREATE TABLE IF NOT EXISTS billing_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(255) NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES billing_subscriptions(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES billing_invoices(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'pending' NOT NULL,
  amount_cents INTEGER DEFAULT 0 NOT NULL,
  currency VARCHAR(3) DEFAULT 'BRL' NOT NULL,
  provider VARCHAR(50) DEFAULT 'internal' NOT NULL,
  provider_invoice_id VARCHAR(255),
  provider_payment_intent_id VARCHAR(255),
  paid_at TIMESTAMP,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS billing_payments_tenant_id_idx ON billing_payments(tenant_id);
CREATE INDEX IF NOT EXISTS billing_payments_subscription_id_idx ON billing_payments(subscription_id);
CREATE INDEX IF NOT EXISTS billing_payments_invoice_id_idx ON billing_payments(invoice_id);
CREATE INDEX IF NOT EXISTS billing_payments_status_idx ON billing_payments(status);
CREATE INDEX IF NOT EXISTS billing_payments_provider_invoice_id_idx ON billing_payments(provider_invoice_id);
CREATE INDEX IF NOT EXISTS billing_payments_provider_payment_intent_id_idx ON billing_payments(provider_payment_intent_id);

CREATE TABLE IF NOT EXISTS stripe_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id VARCHAR(255) NOT NULL,
  event_type VARCHAR(255) NOT NULL,
  tenant_id VARCHAR(255) REFERENCES tenants(tenant_id) ON DELETE SET NULL,
  provider VARCHAR(50) DEFAULT 'stripe' NOT NULL,
  status VARCHAR(50) DEFAULT 'received' NOT NULL,
  processed_at TIMESTAMP,
  failed_at TIMESTAMP,
  retry_count INTEGER DEFAULT 0 NOT NULL,
  raw_event JSONB NOT NULL,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS stripe_events_event_id_unique_idx ON stripe_events(event_id);
CREATE INDEX IF NOT EXISTS stripe_events_tenant_id_idx ON stripe_events(tenant_id);
CREATE INDEX IF NOT EXISTS stripe_events_event_type_idx ON stripe_events(event_type);
CREATE INDEX IF NOT EXISTS stripe_events_status_idx ON stripe_events(status);
CREATE INDEX IF NOT EXISTS stripe_events_processed_at_idx ON stripe_events(processed_at);

CREATE TABLE IF NOT EXISTS tenant_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(255) NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  entitlement_key VARCHAR(100) NOT NULL,
  is_enabled BOOLEAN DEFAULT FALSE NOT NULL,
  numeric_value INTEGER,
  source VARCHAR(30) DEFAULT 'plan' NOT NULL,
  source_ref VARCHAR(255),
  effective_from TIMESTAMP DEFAULT NOW() NOT NULL,
  effective_until TIMESTAMP,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS tenant_entitlements_tenant_id_key_unique_idx ON tenant_entitlements(tenant_id, entitlement_key);
CREATE INDEX IF NOT EXISTS tenant_entitlements_tenant_id_idx ON tenant_entitlements(tenant_id);
CREATE INDEX IF NOT EXISTS tenant_entitlements_entitlement_key_idx ON tenant_entitlements(entitlement_key);
CREATE INDEX IF NOT EXISTS tenant_entitlements_source_idx ON tenant_entitlements(source);
CREATE INDEX IF NOT EXISTS tenant_entitlements_effective_until_idx ON tenant_entitlements(effective_until);

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP;

COMMENT ON TABLE billing_payments IS 'Normalized payments linked to invoices/subscriptions per tenant';
COMMENT ON TABLE stripe_events IS 'Stripe webhook event journal with idempotency and processing state';
COMMENT ON TABLE tenant_entitlements IS 'Source-of-truth for premium feature authorization and numeric quotas';
