-- Migration: Add API Keys and WebAuthn Credentials tables
-- Description: Adiciona suporte para API Keys (M2M) e WebAuthn (biometric auth)
-- Date: 2026-05-04

-- =====================================
-- API KEYS TABLE
-- =====================================

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(255) NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  user_id UUID, -- Opcional - pode ser key de sistema
  name VARCHAR(255) NOT NULL,
  key_prefix VARCHAR(10) NOT NULL,
  key_hash TEXT NOT NULL,
  last_used_at TIMESTAMP,
  expires_at TIMESTAMP, -- NULL = sem expiração
  is_active BOOLEAN NOT NULL DEFAULT true,
  scopes TEXT NOT NULL, -- JSON array de permissões
  rate_limit VARCHAR(50) DEFAULT '1000/hour',
  ip_whitelist TEXT, -- JSON array de IPs permitidos
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMP
);

-- Indexes para api_keys
CREATE UNIQUE INDEX IF NOT EXISTS api_keys_key_hash_idx ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS api_keys_tenant_id_idx ON api_keys(tenant_id);
CREATE INDEX IF NOT EXISTS api_keys_user_id_idx ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS api_keys_is_active_idx ON api_keys(is_active);
CREATE INDEX IF NOT EXISTS api_keys_key_prefix_idx ON api_keys(key_prefix);

-- =====================================
-- WEBAUTHN CREDENTIALS TABLE
-- =====================================

CREATE TABLE IF NOT EXISTS webauthn_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tenant_id VARCHAR(255) NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  credential_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  counter VARCHAR(50) NOT NULL DEFAULT '0',
  device_type VARCHAR(50) NOT NULL, -- 'platform' ou 'cross-platform'
  transports TEXT, -- JSON array: ['usb', 'nfc', 'ble', 'internal']
  aaguid VARCHAR(255), -- Authenticator AAGUID
  credential_name VARCHAR(255),
  last_used_at TIMESTAMP,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes para webauthn_credentials
CREATE UNIQUE INDEX IF NOT EXISTS webauthn_credential_id_idx ON webauthn_credentials(credential_id);
CREATE INDEX IF NOT EXISTS webauthn_user_id_idx ON webauthn_credentials(user_id);
CREATE INDEX IF NOT EXISTS webauthn_tenant_id_idx ON webauthn_credentials(tenant_id);
CREATE INDEX IF NOT EXISTS webauthn_is_active_idx ON webauthn_credentials(is_active);

-- Comentários explicativos
COMMENT ON TABLE api_keys IS 'API Keys para autenticação machine-to-machine';
COMMENT ON COLUMN api_keys.key_hash IS 'SHA-256 hash da API key completa';
COMMENT ON COLUMN api_keys.scopes IS 'JSON array de permissões (ex: ["projects:read", "models:upload"])';
COMMENT ON COLUMN api_keys.rate_limit IS 'Rate limit específico da key (ex: "1000/hour")';

COMMENT ON TABLE webauthn_credentials IS 'Credenciais WebAuthn/FIDO2 para autenticação biométrica';
COMMENT ON COLUMN webauthn_credentials.credential_id IS 'Base64URL encoded credential ID';
COMMENT ON COLUMN webauthn_credentials.public_key IS 'Public key em formato PEM ou COSE';
COMMENT ON COLUMN webauthn_credentials.counter IS 'Signature counter para proteção contra replay';
COMMENT ON COLUMN webauthn_credentials.device_type IS 'platform (Touch ID, Face ID) ou cross-platform (YubiKey)';
