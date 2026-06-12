-- Migration 034: file metadata table for upload pipeline (S02)
CREATE TABLE IF NOT EXISTS files (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     VARCHAR(255) NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  project_id    UUID REFERENCES projects(id) ON DELETE SET NULL,
  storage_key   VARCHAR(512) NOT NULL,
  original_name VARCHAR(255),
  mime_type     VARCHAR(127),
  size_bytes    BIGINT,
  sha256        CHAR(64),
  status        VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  uploaded_at   TIMESTAMP
);

CREATE INDEX IF NOT EXISTS files_tenant_id_idx  ON files (tenant_id);
CREATE INDEX IF NOT EXISTS files_project_id_idx ON files (project_id);
CREATE INDEX IF NOT EXISTS files_status_idx     ON files (status);

-- RLS: tenant isolation (mirrors policy from migration 033)
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS files_tenant_isolation ON files;
CREATE POLICY files_tenant_isolation ON files
  USING (tenant_id = current_tenant_id());
