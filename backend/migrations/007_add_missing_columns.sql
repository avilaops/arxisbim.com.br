-- ====================================
-- MIGRATION: Add Missing Columns
-- Adiciona colunas faltantes para 2FA e API Keys
-- ====================================

-- =====================================
-- USERS: Adicionar colunas de 2FA
-- =====================================
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='users' AND column_name='two_factor_enabled') THEN
    ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN DEFAULT FALSE NOT NULL;
    CREATE INDEX users_two_factor_enabled_idx ON users(two_factor_enabled);
    RAISE NOTICE 'Coluna two_factor_enabled adicionada';
  ELSE
    RAISE NOTICE 'Coluna two_factor_enabled já existe';
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='users' AND column_name='two_factor_secret') THEN
    ALTER TABLE users ADD COLUMN two_factor_secret VARCHAR(255);
    RAISE NOTICE 'Coluna two_factor_secret adicionada';
  ELSE
    RAISE NOTICE 'Coluna two_factor_secret já existe';
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='users' AND column_name='two_factor_backup_codes') THEN
    ALTER TABLE users ADD COLUMN two_factor_backup_codes TEXT;
    RAISE NOTICE 'Coluna two_factor_backup_codes adicionada';
  ELSE
    RAISE NOTICE 'Coluna two_factor_backup_codes já existe';
  END IF;
END $$;

-- =====================================
-- AUTH_TOKENS: Adicionar is_used
-- =====================================
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='auth_tokens' AND column_name='is_used') THEN
    ALTER TABLE auth_tokens ADD COLUMN is_used BOOLEAN DEFAULT FALSE NOT NULL;
    CREATE INDEX auth_tokens_is_used_idx ON auth_tokens(is_used);
    RAISE NOTICE 'Coluna is_used adicionada';
  ELSE
    RAISE NOTICE 'Coluna is_used já existe';
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='auth_tokens' AND column_name='used_at') THEN
    ALTER TABLE auth_tokens ADD COLUMN used_at TIMESTAMP;
    RAISE NOTICE 'Coluna used_at adicionada';
  ELSE
    RAISE NOTICE 'Coluna used_at já existe';
  END IF;
END $$;

-- =====================================
-- USER_SESSIONS: Adicionar is_active
-- =====================================
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='user_sessions' AND column_name='is_active') THEN
    ALTER TABLE user_sessions ADD COLUMN is_active BOOLEAN DEFAULT TRUE NOT NULL;
    CREATE INDEX user_sessions_is_active_idx ON user_sessions(is_active);
    RAISE NOTICE 'Coluna is_active adicionada em user_sessions';
  ELSE
    RAISE NOTICE 'Coluna is_active já existe em user_sessions';
  END IF;
END $$;

-- =====================================
-- API_KEYS: Criar tabela se não existir
-- =====================================
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(255) NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  user_id UUID,
  name VARCHAR(255) NOT NULL,
  key_prefix VARCHAR(10) NOT NULL,
  key_hash TEXT NOT NULL,
  last_used_at TIMESTAMP,
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  scopes TEXT NOT NULL,
  rate_limit VARCHAR(50) DEFAULT '1000/hour',
  ip_whitelist TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  revoked_at TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS api_keys_key_hash_idx ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS api_keys_tenant_id_idx ON api_keys(tenant_id);
CREATE INDEX IF NOT EXISTS api_keys_user_id_idx ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS api_keys_is_active_idx ON api_keys(is_active);
CREATE INDEX IF NOT EXISTS api_keys_key_prefix_idx ON api_keys(key_prefix);

COMMENT ON TABLE api_keys IS 'API Keys para autenticação machine-to-machine';
