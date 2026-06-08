-- ============================================================
-- reset-db.sql — RESET DESTRUTIVO do banco ArxisVR
-- ============================================================
-- Apaga TODOS os dados transacionais e TODOS os usuários,
-- deixando APENAS nicolas@avilaops.com como ADMIN MASTER.
--
-- ⚠️  IRREVERSÍVEL. Faça backup antes (pg_dump) se necessário.
--
-- Uso (host externo do Render):
--   PGPASSWORD=... psql "host=...oregon-postgres.render.com dbname=arxisvr \
--       user=arxisvr sslmode=require" -f backend/scripts/reset-db.sql
--
-- Preserva apenas o schema: users, tenants, companies, _migrations
-- (as demais tabelas são esvaziadas; o schema permanece intacto).
-- ============================================================

\set ON_ERROR_STOP on

BEGIN;

-- 0. Guarda de segurança: aborta se o admin não existir (evita zerar tudo sem dono).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'nicolas@avilaops.com') THEN
    RAISE EXCEPTION 'ABORTADO: nicolas@avilaops.com não existe no banco. Nada foi alterado.';
  END IF;
END $$;

-- 1. Promove nicolas@avilaops.com a ADMIN MASTER (role + permissão + ativo + verificado).
UPDATE users
SET role              = 'admin',
    permissions       = '["admin"]',
    is_active         = true,
    email_verified    = true,
    email_verified_at = COALESCE(email_verified_at, now()),
    tenant_id         = 'avilaops'
WHERE email = 'nicolas@avilaops.com';

-- 2. Esvazia TODAS as tabelas de dados (mantém só users/tenants/companies/_migrations).
--    TRUNCATE ... CASCADE limpa dependências; RESTART IDENTITY zera sequences.
DO $$
DECLARE
  r RECORD;
  keep TEXT[] := ARRAY['users', 'tenants', 'companies', '_migrations'];
BEGIN
  FOR r IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> ALL (keep)
  LOOP
    EXECUTE format('TRUNCATE TABLE public.%I RESTART IDENTITY CASCADE', r.tablename);
  END LOOP;
END $$;

-- 3. Remove todos os usuários, exceto o admin master.
DELETE FROM users WHERE email <> 'nicolas@avilaops.com';

-- NOTA: tenants/companies são tabelas de referência (não criam usuários).
-- Mantidas intactas para preservar o tenant 'avilaops' do admin. Linhas órfãs
-- de referência são inofensivas; o objetivo do reset é o conjunto de USUÁRIOS.

COMMIT;

-- Resultado final
SELECT email, name, role, permissions, is_active, email_verified, tenant_id
FROM users;
