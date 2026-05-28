-- Migration: Add is_used column to auth_tokens table
-- Description: Adiciona coluna para rastrear se tokens de auth foram usados
-- Date: 2026-05-04

-- Adicionar coluna is_used
ALTER TABLE auth_tokens 
ADD COLUMN IF NOT EXISTS is_used BOOLEAN NOT NULL DEFAULT false;

-- Criar index para is_used
CREATE INDEX IF NOT EXISTS auth_tokens_is_used_idx ON auth_tokens(is_used);

-- Comentário explicativo
COMMENT ON COLUMN auth_tokens.is_used IS 'Indica se o token já foi utilizado';
