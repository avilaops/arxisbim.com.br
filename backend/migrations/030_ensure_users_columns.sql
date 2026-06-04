-- Migration 030: Ensure all users columns exist (recovery / idempotent)
-- Adds any columns that may be missing due to partial migration failures.
-- All statements use IF NOT EXISTS — safe to run multiple times.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified_at      TIMESTAMP,
  ADD COLUMN IF NOT EXISTS two_factor_enabled     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS two_factor_secret      VARCHAR(255),
  ADD COLUMN IF NOT EXISTS two_factor_backup_codes TEXT,
  ADD COLUMN IF NOT EXISTS oauth_provider         VARCHAR(50),
  ADD COLUMN IF NOT EXISTS oauth_id               VARCHAR(255),
  ADD COLUMN IF NOT EXISTS last_login_at          TIMESTAMP,
  ADD COLUMN IF NOT EXISTS is_active              BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS users_two_factor_enabled_idx ON users(two_factor_enabled);
CREATE INDEX IF NOT EXISTS users_last_login_at_idx      ON users(last_login_at DESC);
CREATE INDEX IF NOT EXISTS users_email_verified_idx     ON users(email_verified);
CREATE INDEX IF NOT EXISTS users_auth_idx               ON users(tenant_id, email, is_active);

CREATE UNIQUE INDEX IF NOT EXISTS users_oauth_provider_id_idx
  ON users(oauth_provider, oauth_id)
  WHERE oauth_provider IS NOT NULL;
