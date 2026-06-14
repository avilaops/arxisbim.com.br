-- S12: Scenario como objeto central — scenario_state JSONB único + state_version.
-- Aditivo sobre a tabela legada (camera/player/config viram nullable p/ coexistir).
-- Reversível: drop das colunas novas + re-NOT-NULL (com cuidado de dados).

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
