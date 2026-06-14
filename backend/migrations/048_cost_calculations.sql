-- S22: Histórico de cálculos de custo (auditoria e versionamento)
-- Guardamos resultado de cada cálculo para rastreabilidade
-- Cache (Redis) é efêmero; histórico no banco é versioned

CREATE TABLE cost_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  cost_table_version_id UUID, -- qual versão de cost_table foi usada
  total_cost DECIMAL(14,2) NOT NULL, -- BRL, 2 casas decimais
  breakdown_by_type JSONB NOT NULL, -- {IfcWall: {qty, unit, total}, ...}
  breakdown_by_storey JSONB NOT NULL, -- {0: {total}, 1: {total}, ...}
  breakdown_by_category JSONB NOT NULL, -- {architecture, structure, mep}
  s_curve JSONB, -- preenchido no S25 (NULL por enquanto)
  element_count INTEGER NOT NULL DEFAULT 0,
  execution_time_ms INTEGER,
  calculated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP, -- quando cache expira (se usado)
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cost_calculations_scenario_id ON cost_calculations(scenario_id);
CREATE INDEX idx_cost_calculations_calculated_at ON cost_calculations(calculated_at DESC);
CREATE INDEX idx_cost_calculations_scenario_date ON cost_calculations(scenario_id, calculated_at DESC);

-- Denormalizar em scenarios para query rápida
ALTER TABLE scenarios ADD COLUMN cached_total_cost DECIMAL(14,2);
ALTER TABLE scenarios ADD COLUMN cached_cost_updated_at TIMESTAMP;
CREATE INDEX idx_scenarios_cached_cost ON scenarios(cached_total_cost);
