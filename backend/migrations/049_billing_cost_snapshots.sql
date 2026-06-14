-- S26: Billing integration - cost snapshots para cobrança

CREATE TABLE billing_cost_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  total_cost DECIMAL(14,2) NOT NULL,
  element_count INTEGER NOT NULL DEFAULT 0,
  billing_status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending | invoiced | paid
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  calculated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_billing_cost_snapshots_scenario_id ON billing_cost_snapshots(scenario_id);
CREATE INDEX idx_billing_cost_snapshots_project_id ON billing_cost_snapshots(project_id);
CREATE INDEX idx_billing_cost_snapshots_status ON billing_cost_snapshots(billing_status);
CREATE INDEX idx_billing_cost_snapshots_project_status ON billing_cost_snapshots(project_id, billing_status);

-- Auditoria: tracked_at para rastreabilidade
CREATE INDEX idx_billing_cost_snapshots_period ON billing_cost_snapshots(created_at DESC);

COMMENT ON TABLE billing_cost_snapshots IS 'Snapshots de custos para cobrança e auditoria';
COMMENT ON COLUMN billing_cost_snapshots.billing_status IS 'pending=não-cobrado, invoiced=em fatura, paid=liquidado';
