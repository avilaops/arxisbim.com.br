-- Migration 003: Auth Tokens (Password Reset & Email Verification)
-- ArxisVR Backend - 2026
-- Criação de tabela para gerenciar tokens de autenticação

-- =====================================
-- AUTH_TOKENS TABLE
-- =====================================
CREATE TABLE IF NOT EXISTS auth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tenant_id VARCHAR(255) NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  token_type VARCHAR(50) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS auth_tokens_token_idx ON auth_tokens(token);
CREATE INDEX IF NOT EXISTS auth_tokens_user_id_token_type_idx ON auth_tokens(user_id, token_type);
CREATE INDEX IF NOT EXISTS auth_tokens_expires_at_idx ON auth_tokens(expires_at);

-- Adicionar campo email_verified na tabela users (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'email_verified'
  ) THEN
    ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Adicionar campo email_verified_at na tabela users (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'email_verified_at'
  ) THEN
    ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMP;
  END IF;
END $$;

-- Index para email_verified
CREATE INDEX IF NOT EXISTS users_email_verified_idx ON users(email_verified);

-- Autovacuum otimizado (high-volume table)
DO $$
BEGIN
  EXECUTE 'ALTER TABLE auth_tokens SET (autovacuum_vacuum_scale_factor = 0.01)';
  EXECUTE 'ALTER TABLE auth_tokens SET (autovacuum_analyze_scale_factor = 0.005)';
  EXECUTE 'ALTER TABLE auth_tokens SET (fillfactor = 90)';
END $$;

-- Comments
COMMENT ON TABLE auth_tokens IS 'Tokens para reset de senha, verificação de email e 2FA';
COMMENT ON COLUMN auth_tokens.token_type IS 'Tipo de token: password_reset, email_verification, 2fa_setup';
COMMENT ON COLUMN auth_tokens.used_at IS 'Timestamp de quando o token foi usado (null = não usado)';
