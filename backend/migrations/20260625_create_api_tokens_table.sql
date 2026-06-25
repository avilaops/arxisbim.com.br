-- API Tokens table (store hashes ONLY, never plaintext)
-- Pepper used: sha256(token + process.env.API_TOKEN_PEPPER)
CREATE TABLE IF NOT EXISTS api_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  created_by_id UUID NOT NULL,

  name VARCHAR(120) NOT NULL,
  prefix VARCHAR(40) NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,

  scopes JSONB NOT NULL DEFAULT '[]'::jsonb,
  environment VARCHAR(10) NOT NULL DEFAULT 'live' CHECK (environment IN ('live', 'test')),

  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  last_used_ip VARCHAR(64),
  revoked_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para queries rápidas
CREATE INDEX IF NOT EXISTS idx_api_tokens_tenant_id ON api_tokens (tenant_id);
CREATE INDEX IF NOT EXISTS idx_api_tokens_token_hash ON api_tokens (token_hash) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_api_tokens_created_by_id ON api_tokens (created_by_id);
CREATE INDEX IF NOT EXISTS idx_api_tokens_revoked_at ON api_tokens (revoked_at);

-- Audit log para API tokens (who did what, when)
-- NEVER logs plaintext tokens, only token IDs, prefixes, and user info
CREATE TABLE IF NOT EXISTS api_token_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID NOT NULL REFERENCES api_tokens (id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  user_id UUID,

  action VARCHAR(50) NOT NULL CHECK (action IN ('created', 'revoked', 'used', 'failed_auth', 'scope_denied')),
  token_prefix VARCHAR(40),
  ip_address VARCHAR(64),
  user_agent TEXT,
  error_message TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_token_audit_logs_token_id ON api_token_audit_logs (token_id);
CREATE INDEX IF NOT EXISTS idx_api_token_audit_logs_tenant_id ON api_token_audit_logs (tenant_id);
CREATE INDEX IF NOT EXISTS idx_api_token_audit_logs_created_at ON api_token_audit_logs (created_at);
CREATE INDEX IF NOT EXISTS idx_api_token_audit_logs_user_id ON api_token_audit_logs (user_id);
