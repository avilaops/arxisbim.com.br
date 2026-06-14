-- S21: SINAPI items — CEF base (mensal por estado)
-- Versionamento por (state_code, reference_month) — múltiplas versões coexistem

CREATE TABLE sinapi_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) NOT NULL, -- ex: '74209/001'
  description TEXT NOT NULL,
  unit VARCHAR(10) NOT NULL, -- 'M2', 'M3', 'UN', 'KG', 'H'
  price_with_tax DECIMAL(12,4) NOT NULL,
  price_without_tax DECIMAL(12,4) NOT NULL, -- obras públicas usam este
  state_code VARCHAR(2) NOT NULL, -- UF (ex: 'SP', 'RJ')
  reference_month DATE NOT NULL, -- ex: 2026-01-01
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  UNIQUE(code, state_code, reference_month)
);

-- Índices para performance
CREATE INDEX idx_sinapi_code ON sinapi_items(code);
CREATE INDEX idx_sinapi_state_month ON sinapi_items(state_code, reference_month);
CREATE INDEX idx_sinapi_description_gin ON sinapi_items USING GIN (to_tsvector('portuguese', description));

-- Opcional: trigram para busca de substring (requer extensão)
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- CREATE INDEX idx_sinapi_description_trgm ON sinapi_items USING GIN (description gin_trgm_ops);

-- Vincular cost_items a item SINAPI específico (opcional, para rastreabilidade)
ALTER TABLE cost_items ADD COLUMN sinapi_item_id UUID REFERENCES sinapi_items(id) ON DELETE SET NULL;
CREATE INDEX idx_cost_items_sinapi_id ON cost_items(sinapi_item_id);
