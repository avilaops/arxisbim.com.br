-- Migration 035: S03 — Project → Model → ModelVersion hierarchy
-- Extends projects with slug/project_code/soft-delete and creates the
-- model + model_versions tables that anchor scenarios (S12), schedules (S25)
-- and cost tables (S19).

-- ── projects: new columns ────────────────────────────────────────────────
ALTER TABLE projects ADD COLUMN IF NOT EXISTS slug VARCHAR(100);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_code VARCHAR(100);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- company_id era NOT NULL mas o fluxo self-service cria projeto sem company
ALTER TABLE projects ALTER COLUMN company_id DROP NOT NULL;

-- Backfill slug para linhas existentes (nome slugificado + sufixo do id)
UPDATE projects
SET slug = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || LEFT(id::text, 8)
WHERE slug IS NULL;

ALTER TABLE projects ALTER COLUMN slug SET NOT NULL;

-- Slug único por tenant (apenas entre projetos não deletados)
CREATE UNIQUE INDEX IF NOT EXISTS projects_tenant_slug_idx
  ON projects (tenant_id, slug) WHERE deleted_at IS NULL;

-- Índice de listagem: tenant + soft-delete
CREATE INDEX IF NOT EXISTS projects_tenant_deleted_idx ON projects (tenant_id, deleted_at);

-- ── models ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS models (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id         UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name               VARCHAR(255) NOT NULL,
  current_version_id UUID,             -- FK adicionada após criar model_versions
  created_at         TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at         TIMESTAMP
);

CREATE INDEX IF NOT EXISTS models_project_id_idx ON models (project_id);
CREATE INDEX IF NOT EXISTS models_project_deleted_idx ON models (project_id, deleted_at);

-- ── model_versions ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS model_versions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id     UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  version      INT NOT NULL,
  status       VARCHAR(20) NOT NULL DEFAULT 'uploading',  -- uploading/processing/ready/failed
  storage_key  VARCHAR(500),
  file_size    BIGINT,
  sha256       CHAR(64),
  metadata     JSONB,
  processed_at TIMESTAMP,
  created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (model_id, version)
);

CREATE INDEX IF NOT EXISTS model_versions_model_id_idx ON model_versions (model_id);
CREATE INDEX IF NOT EXISTS model_versions_status_idx ON model_versions (status);

-- FK circular: models.current_version_id → model_versions
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'models_current_version_fk'
  ) THEN
    ALTER TABLE models ADD CONSTRAINT models_current_version_fk
      FOREIGN KEY (current_version_id) REFERENCES model_versions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ── RLS (isolamento via projects.tenant_id) ──────────────────────────────
ALTER TABLE models ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS models_tenant_isolation ON models;
CREATE POLICY models_tenant_isolation ON models
  USING (project_id IN (SELECT id FROM projects WHERE tenant_id = current_tenant_id()));

ALTER TABLE model_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS model_versions_tenant_isolation ON model_versions;
CREATE POLICY model_versions_tenant_isolation ON model_versions
  USING (model_id IN (
    SELECT m.id FROM models m
    JOIN projects p ON p.id = m.project_id
    WHERE p.tenant_id = current_tenant_id()
  ));
