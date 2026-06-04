-- Migration 028: password_history
-- Stores hashes of last N passwords to prevent reuse.

CREATE TABLE IF NOT EXISTS password_history (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL,
  tenant_id  VARCHAR(255) NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  hash       TEXT        NOT NULL,
  created_at TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS password_history_user_id_idx
  ON password_history(user_id, created_at DESC);
