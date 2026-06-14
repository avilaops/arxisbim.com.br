-- S11: histórico durável de etapas do pipeline IFC (model_processing_runs).
-- Infra genérica reusada por S20/S28/cenários. Aditiva, reversível (drop table).

CREATE TABLE IF NOT EXISTS model_processing_runs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_version_id  UUID NOT NULL REFERENCES model_versions(id) ON DELETE CASCADE,
  stage             VARCHAR(50) NOT NULL,   -- download|parse_structure|parse_geometry|serialize_glb|upload_glb|update_db
  status            VARCHAR(20) NOT NULL,   -- running|ok|failed
  started_at        TIMESTAMP,
  finished_at       TIMESTAMP,
  duration_ms       INTEGER,
  error_message     TEXT,
  created_at        TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS model_processing_runs_model_version_idx ON model_processing_runs (model_version_id);
CREATE INDEX IF NOT EXISTS model_processing_runs_stage_idx ON model_processing_runs (stage);
