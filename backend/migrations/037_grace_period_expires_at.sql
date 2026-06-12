-- 037: Janela máxima de grace_period.
-- Quando um pagamento falha, a assinatura entra em 'grace_period' e ganha um
-- prazo (grace_period_expires_at). Um job transiciona para 'past_due' quando o
-- prazo vence, fechando o último gap de estado do ciclo de billing.

ALTER TABLE billing_subscriptions
  ADD COLUMN IF NOT EXISTS grace_period_expires_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS billing_subscriptions_grace_expires_idx
  ON billing_subscriptions (grace_period_expires_at)
  WHERE grace_period_expires_at IS NOT NULL;
