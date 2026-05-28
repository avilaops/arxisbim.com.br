-- ====================================
-- MIGRATION 008: Fix Multi-tenant Constraints
-- Corrige constraints para permitir multi-tenancy real
-- ====================================

-- =====================================
-- USERS: Corrigir constraint UNIQUE
-- =====================================

-- 1. Remover constraint UNIQUE apenas em email
DO $$ 
BEGIN
  -- Verificar se existe constraint/index users_email_unique
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'users_email_unique'
  ) THEN
    ALTER TABLE users DROP CONSTRAINT users_email_unique;
    RAISE NOTICE 'Constraint users_email_unique removido';
  END IF;
  
  -- Verificar se existe index users_email_idx (UNIQUE)
  IF EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'users_email_idx'
    AND indexdef LIKE '%UNIQUE%'
  ) THEN
    DROP INDEX IF EXISTS users_email_idx;
    RAISE NOTICE 'Index UNIQUE users_email_idx removido';
  END IF;
END $$;

-- 2. Criar index composto UNIQUE (tenant_id, email)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'users_tenant_email_unique_idx'
  ) THEN
    CREATE UNIQUE INDEX users_tenant_email_unique_idx ON users(tenant_id, email);
    RAISE NOTICE 'Index UNIQUE composto (tenant_id, email) criado';
  ELSE
    RAISE NOTICE 'Index UNIQUE composto já existe';
  END IF;
END $$;

-- 3. Criar index não-único em email (para busca rápida)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'users_email_search_idx'
  ) THEN
    CREATE INDEX users_email_search_idx ON users(email);
    RAISE NOTICE 'Index de busca em email criado';
  ELSE
    RAISE NOTICE 'Index de busca em email já existe';
  END IF;
END $$;

-- =====================================
-- Comentários explicativos
-- =====================================
COMMENT ON INDEX users_tenant_email_unique_idx IS 'Garante unicidade de email dentro de cada tenant (multi-tenancy real)';
COMMENT ON INDEX users_email_search_idx IS 'Index para busca rápida por email (não-único, permite mesmo email em tenants diferentes)';

-- =====================================
-- Verificação final
-- =====================================
DO $$ 
DECLARE
  email_count INTEGER;
  duplicate_count INTEGER;
BEGIN
  -- Contar total de emails
  SELECT COUNT(*) INTO email_count FROM users;
  
  -- Contar duplicatas dentro do mesmo tenant (não deve existir)
  SELECT COUNT(*) INTO duplicate_count 
  FROM (
    SELECT tenant_id, email, COUNT(*) as cnt
    FROM users
    GROUP BY tenant_id, email
    HAVING COUNT(*) > 1
  ) duplicates;
  
  RAISE NOTICE 'Total de usuários: %', email_count;
  RAISE NOTICE 'Duplicatas dentro do mesmo tenant: %', duplicate_count;
  
  IF duplicate_count > 0 THEN
    RAISE WARNING 'Existem emails duplicados dentro do mesmo tenant! Corrija antes de aplicar o constraint.';
  END IF;
END $$;
