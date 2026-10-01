-- Rollback manual da fundação dos Módulos Ávila no n8n.
-- Requer backup confirmado e janela de manutenção. Não executar em produção
-- enquanto existirem eventos ou atribuições que precisem ser preservados.
BEGIN;
DROP TABLE IF EXISTS avila_control.audit_chain;
DROP TABLE IF EXISTS avila_control.principal_roles;
DROP TABLE IF EXISTS avila_control.role_capabilities;
DROP TABLE IF EXISTS avila_control.roles;
DROP TABLE IF EXISTS avila_control.principals;
DELETE FROM avila_control.schema_migrations WHERE version = '001_foundation';
DROP TABLE IF EXISTS avila_control.organizations;
COMMIT;
