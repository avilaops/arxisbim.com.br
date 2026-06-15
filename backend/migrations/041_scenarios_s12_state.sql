-- S12: Scenario como objeto central — scenario_state JSONB único + state_version.
-- Aditivo sobre a tabela legada (camera/player/config viram nullable p/ coexistir).
-- Reversível: drop das colunas novas + re-NOT-NULL (com cuidado de dados).

-- Ensure base scenarios table exists if it was somehow dropped/missing in target db
CREATE TABLE IF NOT EXISTS scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(255) NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  preset_id VARCHAR(80),
  camera JSONB,
  player JSONB,
  config JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS scenarios_tenant_id_idx ON scenarios(tenant_id);
CREATE INDEX IF NOT EXISTS scenarios_project_id_idx ON scenarios(project_id);
CREATE INDEX IF NOT EXISTS scenarios_created_by_idx ON scenarios(created_by);
CREATE INDEX IF NOT EXISTS scenarios_preset_id_idx ON scenarios(preset_id);
CREATE INDEX IF NOT EXISTS scenarios_tenant_project_updated_idx ON scenarios(tenant_id, project_id, updated_at DESC);

-- Ensure RLS is enabled on scenarios
ALTER TABLE scenarios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS scenarios_tenant_isolation ON scenarios;
CREATE POLICY scenarios_tenant_isolation ON scenarios
  USING (tenant_id = current_tenant_id());

-- S12 extensions:
ALTER TABLE scenarios ADD COLUMN IF NOT EXISTS model_version_id UUID REFERENCES model_versions(id) ON DELETE CASCADE;
ALTER TABLE scenarios ADD COLUMN IF NOT EXISTS scenario_state JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE scenarios ADD COLUMN IF NOT EXISTS state_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE scenarios ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES scenarios(id) ON DELETE SET NULL;
ALTER TABLE scenarios ADD COLUMN IF NOT EXISTS is_base_scenario BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE scenarios ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE scenarios ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Cenários S12 usam scenario_state; o formato legado (camera/player/config) deixa
-- de ser obrigatório p/ os dois conviverem.
ALTER TABLE scenarios ALTER COLUMN camera DROP NOT NULL;
ALTER TABLE scenarios ALTER COLUMN player DROP NOT NULL;
ALTER TABLE scenarios ALTER COLUMN config DROP NOT NULL;

CREATE INDEX IF NOT EXISTS scenarios_model_version_idx ON scenarios (model_version_id);
CREATE INDEX IF NOT EXISTS scenarios_parent_idx ON scenarios (parent_id);
