-- Migration: Add Two-Factor Authentication fields to users table
-- Description: Adiciona campos para suporte a 2FA (TOTP)
-- Date: 2026-05-04

-- Adicionar campos de 2FA
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR(255),
ADD COLUMN IF NOT EXISTS two_factor_backup_codes TEXT;

-- Criar index para two_factor_enabled
CREATE INDEX IF NOT EXISTS users_two_factor_enabled_idx ON users(two_factor_enabled);

-- Comentários explicativos
COMMENT ON COLUMN users.two_factor_enabled IS 'Indica se 2FA está ativado para o usuário';
COMMENT ON COLUMN users.two_factor_secret IS 'Secret TOTP (base32 encoded) para autenticação de dois fatores';
COMMENT ON COLUMN users.two_factor_backup_codes IS 'JSON array de backup codes hasheados (SHA-256)';
