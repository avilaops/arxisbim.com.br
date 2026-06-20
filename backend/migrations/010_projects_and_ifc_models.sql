-- ====================================
-- MIGRATION 014: Projects + IFC Models
-- Closes drift between Drizzle schema (src/shared/database/schema/projects.ts)
-- and applied SQL migrations. Tables existed in schema but had no SQL.
-- ====================================

-- =====================================
-- PROJECTS (scoped by tenant + company)
-- =====================================
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(255) NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  company_id VARCHAR(255) NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  location JSONB,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS projects_tenant_id_idx ON projects(tenant_id);
CREATE INDEX IF NOT EXISTS projects_company_id_idx ON projects(company_id);

COMMENT ON TABLE projects IS 'BIM projects scoped by tenant + company';

-- =====================================
-- IFC_MODELS (single IFC per entry)
-- =====================================
CREATE TABLE IF NOT EXISTS ifc_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  tenant_id VARCHAR(255) NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_size_bytes INTEGER,
  ifc_type VARCHAR(50),
  discipline VARCHAR(50),
  phase VARCHAR(50),
  thumbnail_url TEXT,
  uploaded_by UUID REFERENCES tenants(id) ON DELETE SET NULL,
  metadata JSONB,
  uploaded_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ifc_models_project_id_idx ON ifc_models(project_id);
CREATE INDEX IF NOT EXISTS ifc_models_tenant_id_idx ON ifc_models(tenant_id);
CREATE INDEX IF NOT EXISTS ifc_models_discipline_idx ON ifc_models(discipline);
CREATE INDEX IF NOT EXISTS ifc_models_phase_idx ON ifc_models(phase);

COMMENT ON TABLE ifc_models IS 'Uploaded IFC files per project (IFC 2x3, 4, 4.3)';

-- =====================================
-- FEDERATED_MODELS (multiple IFCs combined)
-- =====================================
CREATE TABLE IF NOT EXISTS federated_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  models JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS federated_models_project_id_idx ON federated_models(project_id);

COMMENT ON TABLE federated_models IS 'Federated combinations of multiple IFC models';

-- =====================================
-- MODEL_ELEMENTS (extracted IFC elements for querying)
-- =====================================
CREATE TABLE IF NOT EXISTS model_elements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ifc_model_id UUID NOT NULL REFERENCES ifc_models(id) ON DELETE CASCADE,
  express_id INTEGER NOT NULL,
  global_id VARCHAR(50),
  type VARCHAR(100) NOT NULL,
  name VARCHAR(255),
  properties JSONB,
  geometry JSONB
);

CREATE INDEX IF NOT EXISTS model_elements_ifc_model_id_idx ON model_elements(ifc_model_id);
CREATE INDEX IF NOT EXISTS model_elements_express_id_idx ON model_elements(express_id);
CREATE INDEX IF NOT EXISTS model_elements_type_idx ON model_elements(type);

COMMENT ON TABLE model_elements IS 'Indexed IFC element rows (IfcWall, IfcSlab, etc.) for fast queries';
