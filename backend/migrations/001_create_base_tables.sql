-- ====================================
-- MIGRATION 001: Base Tables
-- ArxisVR - PostgreSQL 18
-- ====================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================
-- TENANTS
-- =====================================
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  branding JSONB,
  subscription JSONB,
  settings JSONB,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS tenants_tenant_id_idx ON tenants(tenant_id);

-- =====================================
-- COMPANIES
-- =====================================
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id VARCHAR(255) NOT NULL UNIQUE,
  tenant_id VARCHAR(255) NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  branding JSONB,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS companies_company_id_idx ON companies(company_id);
CREATE INDEX IF NOT EXISTS companies_tenant_id_idx ON companies(tenant_id);

-- =====================================
-- USERS
-- =====================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  password_hash TEXT NOT NULL,
  tenant_id VARCHAR(255) NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  company_id VARCHAR(255) REFERENCES companies(company_id) ON DELETE SET NULL,
  role VARCHAR(50) DEFAULT 'user' NOT NULL,
  permissions JSONB,
  email_verified BOOLEAN DEFAULT FALSE NOT NULL,
  email_verified_at TIMESTAMP,
  two_factor_enabled BOOLEAN DEFAULT FALSE NOT NULL,
  two_factor_secret VARCHAR(255),
  two_factor_backup_codes TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  last_login_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx ON users(email);
CREATE INDEX IF NOT EXISTS users_tenant_id_email_idx ON users(tenant_id, email);
CREATE INDEX IF NOT EXISTS users_tenant_id_active_idx ON users(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS users_company_id_idx ON users(company_id);
CREATE INDEX IF NOT EXISTS users_last_login_at_idx ON users(last_login_at DESC);
CREATE INDEX IF NOT EXISTS users_email_verified_idx ON users(email_verified);
CREATE INDEX IF NOT EXISTS users_two_factor_enabled_idx ON users(two_factor_enabled);
CREATE INDEX IF NOT EXISTS users_auth_idx ON users(tenant_id, email, is_active);

-- =====================================
-- AUTH_TOKENS
-- =====================================
CREATE TABLE IF NOT EXISTS auth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tenant_id VARCHAR(255) NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  token_type VARCHAR(50) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  is_used BOOLEAN DEFAULT FALSE NOT NULL,
  used_at TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS auth_tokens_token_idx ON auth_tokens(token);
CREATE INDEX IF NOT EXISTS auth_tokens_user_id_token_type_idx ON auth_tokens(user_id, token_type);
CREATE INDEX IF NOT EXISTS auth_tokens_expires_at_idx ON auth_tokens(expires_at);
CREATE INDEX IF NOT EXISTS auth_tokens_is_used_idx ON auth_tokens(is_used);

-- =====================================
-- API_KEYS
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

-- =====================================
-- USER_SESSIONS (opcional mas útil)
-- =====================================
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tenant_id VARCHAR(255) NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  refresh_token TEXT NOT NULL UNIQUE,
  access_token_jti VARCHAR(255),
  expires_at TIMESTAMP NOT NULL,
  last_active_at TIMESTAMP,
  ip_address VARCHAR(45),
  user_agent TEXT,
  device_info JSONB,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS user_sessions_user_id_idx ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS user_sessions_tenant_id_idx ON user_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS user_sessions_refresh_token_idx ON user_sessions(refresh_token);
CREATE INDEX IF NOT EXISTS user_sessions_is_active_idx ON user_sessions(is_active);

-- =====================================
-- SEED: Tenant de teste
-- =====================================
INSERT INTO tenants (tenant_id, name, is_active)
VALUES ('test-tenant-e2e', 'Test Tenant E2E', TRUE)
ON CONFLICT (tenant_id) DO NOTHING;

COMMENT ON TABLE tenants IS 'Multi-tenant isolation - cada tenant é uma organização separada';
COMMENT ON TABLE companies IS 'Companies dentro de um tenant - suborganizações';
COMMENT ON TABLE users IS 'Usuários do sistema com autenticação multi-tenant';
COMMENT ON TABLE auth_tokens IS 'Tokens de reset de senha, verificação de email, etc.';
COMMENT ON TABLE api_keys IS 'API Keys para autenticação machine-to-machine';
COMMENT ON TABLE user_sessions IS 'Sessões de usuários com refresh tokens';
