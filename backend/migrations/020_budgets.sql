-- =====================================
-- Migration 020: BIM 5D Budgets
-- =====================================
-- Persiste orçamentos (Budget) e itens de custo (CostItem) por tenant/projeto.
-- Total cost cache mantido pela aplicação (BudgetsService).
-- =====================================

CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(255) NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  total_cost REAL NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS budgets_tenant_id_idx ON budgets(tenant_id);
CREATE INDEX IF NOT EXISTS budgets_project_id_idx ON budgets(project_id);
CREATE INDEX IF NOT EXISTS budgets_created_by_idx ON budgets(created_by);
CREATE INDEX IF NOT EXISTS budgets_tenant_project_updated_idx
  ON budgets(tenant_id, project_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS budget_cost_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  description VARCHAR(500) NOT NULL,
  unit VARCHAR(32) NOT NULL,
  quantity REAL NOT NULL DEFAULT 0,
  unit_price REAL NOT NULL DEFAULT 0,
  total_price REAL NOT NULL DEFAULT 0,
  linked_elements JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS budget_cost_items_budget_id_idx ON budget_cost_items(budget_id);
CREATE INDEX IF NOT EXISTS budget_cost_items_budget_position_idx
  ON budget_cost_items(budget_id, position);

COMMENT ON TABLE budgets IS 'BIM 5D budgets scoped by tenant and project';
COMMENT ON TABLE budget_cost_items IS 'Cost items belonging to a BIM 5D budget';
