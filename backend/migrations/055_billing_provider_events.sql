-- =====================================
-- Migration 055: jornal de eventos do provedor de cobrança
-- =====================================
-- A cobrança recorrente passa a ser feita pelo Mercado Pago (assinatura /
-- preapproval). O jornal de webhooks deixa de ter nome de provedor: vira
-- billing_provider_events, com a coluna `provider` dizendo de quem veio.
--
-- As migrações 022/023/036 (já aplicadas) não são editadas — só renomeamos.
-- =====================================

ALTER TABLE IF EXISTS stripe_events RENAME TO billing_provider_events;

ALTER INDEX IF EXISTS stripe_events_event_id_unique_idx RENAME TO billing_provider_events_event_id_unique_idx;
ALTER INDEX IF EXISTS stripe_events_tenant_id_idx RENAME TO billing_provider_events_tenant_id_idx;
ALTER INDEX IF EXISTS stripe_events_event_type_idx RENAME TO billing_provider_events_event_type_idx;
ALTER INDEX IF EXISTS stripe_events_status_idx RENAME TO billing_provider_events_status_idx;
ALTER INDEX IF EXISTS stripe_events_processed_at_idx RENAME TO billing_provider_events_processed_at_idx;
ALTER INDEX IF EXISTS stripe_events_next_retry_at_idx RENAME TO billing_provider_events_next_retry_at_idx;
ALTER INDEX IF EXISTS stripe_events_pkey RENAME TO billing_provider_events_pkey;

-- Banco novo (sem a tabela antiga): cria já com o nome definitivo.
CREATE TABLE IF NOT EXISTS billing_provider_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id VARCHAR(255) NOT NULL,
  event_type VARCHAR(255) NOT NULL,
  tenant_id VARCHAR(255) REFERENCES tenants(tenant_id) ON DELETE SET NULL,
  provider VARCHAR(50) DEFAULT 'mercadopago' NOT NULL,
  status VARCHAR(50) DEFAULT 'received' NOT NULL,
  processed_at TIMESTAMP,
  failed_at TIMESTAMP,
  next_retry_at TIMESTAMP,
  retry_count INTEGER DEFAULT 0 NOT NULL,
  raw_event JSONB NOT NULL,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS billing_provider_events_event_id_unique_idx ON billing_provider_events(event_id);
CREATE INDEX IF NOT EXISTS billing_provider_events_tenant_id_idx ON billing_provider_events(tenant_id);
CREATE INDEX IF NOT EXISTS billing_provider_events_event_type_idx ON billing_provider_events(event_type);
CREATE INDEX IF NOT EXISTS billing_provider_events_status_idx ON billing_provider_events(status);
CREATE INDEX IF NOT EXISTS billing_provider_events_processed_at_idx ON billing_provider_events(processed_at);
CREATE INDEX IF NOT EXISTS billing_provider_events_next_retry_at_idx ON billing_provider_events(next_retry_at);

ALTER TABLE billing_provider_events ALTER COLUMN provider SET DEFAULT 'mercadopago';

COMMENT ON TABLE billing_provider_events IS 'Jornal de notificações do provedor de cobrança, com idempotência e estado de processamento';

-- Assinaturas que dependiam do provedor antigo não têm mais quem as cobre:
-- viram "internal" (aprovação manual) e guardam a origem nos metadados para
-- o cliente ser convidado a cadastrar o cartão no Mercado Pago.
UPDATE billing_subscriptions
SET provider = 'internal',
    metadata = COALESCE(metadata, '{}'::jsonb)
      || jsonb_build_object('legacyProvider', provider, 'legacyProviderSubscriptionId', provider_subscription_id),
    updated_at = NOW()
WHERE provider = 'stripe';
