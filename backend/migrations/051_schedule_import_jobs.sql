-- Migration: 051_schedule_import_jobs
-- Description: Create schedule_import_jobs table for asynchronous imports
CREATE TABLE IF NOT EXISTS schedule_import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  error_message TEXT,
  errors JSONB,
  schedule_id UUID,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS schedule_import_jobs_project_id_idx ON schedule_import_jobs(project_id);
CREATE INDEX IF NOT EXISTS schedule_import_jobs_status_idx ON schedule_import_jobs(status);
