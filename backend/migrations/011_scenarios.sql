-- =====================================
-- Migration 011: Persistent Scenarios
-- =====================================
-- Persiste cenários do viewer/Copilot por tenant e projeto,
-- mantendo estado de câmera, jogador, configuração e metadados.
-- =====================================

CREATE TABLE IF NOT EXISTS scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(255) NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  preset_id VARCHAR(80),
  camera JSONB NOT NULL,
  player JSONB NOT NULL,
  config JSONB NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS scenarios_tenant_id_idx ON scenarios(tenant_id);
CREATE INDEX IF NOT EXISTS scenarios_project_id_idx ON scenarios(project_id);
CREATE INDEX IF NOT EXISTS scenarios_created_by_idx ON scenarios(created_by);
CREATE INDEX IF NOT EXISTS scenarios_preset_id_idx ON scenarios(preset_id);
CREATE INDEX IF NOT EXISTS scenarios_tenant_project_updated_idx ON scenarios(tenant_id, project_id, updated_at DESC);

COMMENT ON TABLE scenarios IS 'Persistent viewer and Copilot scenarios scoped by tenant and project';
