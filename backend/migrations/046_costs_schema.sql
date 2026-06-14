-- S19: Modelo de dados de custos (schema foundation)
-- Suporta: cenários independentes, SINAPI com versionamento, override por elemento, versionamento

-- Tabela de preços (SINAPI ou customizada)
CREATE TABLE cost_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  scenario_id UUID REFERENCES scenarios(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  source VARCHAR(50) NOT NULL DEFAULT 'custom', -- 'sinapi' | 'custom' | 'import'
  state_code VARCHAR(2), -- UF para SINAPI (ex: 'SP', 'RJ')
  reference_month DATE, -- mês de referência SINAPI (ex: 2026-01-01)
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cost_tables_project_id ON cost_tables(project_id);
CREATE INDEX idx_cost_tables_scenario_id ON cost_tables(scenario_id);
CREATE INDEX idx_cost_tables_source_state ON cost_tables(source, state_code);

-- Item de custo (linha da tabela)
CREATE TABLE cost_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cost_table_id UUID NOT NULL REFERENCES cost_tables(id) ON DELETE CASCADE,
  code VARCHAR(50), -- código SINAPI ex: "74209/001"
  description TEXT NOT NULL,
  unit VARCHAR(20) NOT NULL, -- 'm²', 'm³', 'un', 'kg', 'h'
  unit_price DECIMAL(12,4) NOT NULL, -- NEVER FLOAT — decimal for monetary values
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cost_items_cost_table_id ON cost_items(cost_table_id);
CREATE INDEX idx_cost_items_code ON cost_items(code);

-- Vínculo: elemento IFC ↔ item de custo + quantidade
CREATE TABLE element_cost_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  element_global_id VARCHAR(22) NOT NULL, -- âncora no elemento IFC
  cost_item_id UUID NOT NULL REFERENCES cost_items(id) ON DELETE CASCADE,
  quantity DECIMAL(14,4) NOT NULL DEFAULT 0, -- calculado no S20
  quantity_unit VARCHAR(20), -- pode diferir de cost_item.unit (converção em S22)
  override_price DECIMAL(12,4), -- NULL = usa unit_price do cost_item
  override_reason TEXT, -- obrigatório se override_price não-NULL (rastreabilidade)
  note TEXT,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_element_cost_links_scenario_id ON element_cost_links(scenario_id);
CREATE INDEX idx_element_cost_links_element_id ON element_cost_links(element_global_id);
CREATE INDEX idx_element_cost_links_cost_item_id ON element_cost_links(cost_item_id);

-- Denormalização para performance: pré-calculado no S22
ALTER TABLE scenarios ADD COLUMN estimated_cost DECIMAL(16,2); -- custo total estimado do cenário
ALTER TABLE scenarios ADD COLUMN cost_table_id UUID REFERENCES cost_tables(id) ON DELETE SET NULL; -- tabela de preços padrão

CREATE INDEX idx_scenarios_cost_table_id ON scenarios(cost_table_id);
