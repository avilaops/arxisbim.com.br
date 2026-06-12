-- 039: tabelas de workspace (memberships + workspace_invites).
-- Estavam definidas no schema Drizzle (schema/workspaces.ts) e são consultadas
-- por workspaces.routes.ts (rota REGISTRADA), mas nenhuma migration as criava —
-- features de workspace quebrariam em produção com "relation does not exist".

CREATE TABLE IF NOT EXISTS memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id VARCHAR(255) NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'member',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS memberships_user_tenant_uidx ON memberships (user_id, tenant_id);
CREATE INDEX IF NOT EXISTS memberships_user_id_idx ON memberships (user_id);
CREATE INDEX IF NOT EXISTS memberships_tenant_id_idx ON memberships (tenant_id);

CREATE TABLE IF NOT EXISTS workspace_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(255) NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'member',
  token VARCHAR(80) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  accepted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  expires_at TIMESTAMP NOT NULL,
  accepted_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS workspace_invites_token_uidx ON workspace_invites (token);
CREATE INDEX IF NOT EXISTS workspace_invites_tenant_id_idx ON workspace_invites (tenant_id);
CREATE INDEX IF NOT EXISTS workspace_invites_email_idx ON workspace_invites (email);
CREATE INDEX IF NOT EXISTS workspace_invites_status_idx ON workspace_invites (status);
