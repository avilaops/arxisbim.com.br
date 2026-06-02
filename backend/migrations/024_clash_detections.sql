-- Migration 024: Clash Detection Engine
-- Creates the clash_detections table to persist results from the AABB-based
-- clash detection engine.

CREATE TABLE IF NOT EXISTS clash_detections (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          UUID        NOT NULL REFERENCES projects(id)    ON DELETE CASCADE,
  tenant_id           VARCHAR(255) NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  federation_id       UUID        REFERENCES federated_models(id)     ON DELETE SET NULL,

  -- Model references
  model1_id           UUID        NOT NULL REFERENCES ifc_models(id)  ON DELETE CASCADE,
  model2_id           UUID        NOT NULL REFERENCES ifc_models(id)  ON DELETE CASCADE,

  -- Element 1
  element1_global_id  VARCHAR(50),
  element1_type       VARCHAR(100),
  element1_name       VARCHAR(255),

  -- Element 2
  element2_global_id  VARCHAR(50),
  element2_type       VARCHAR(100),
  element2_name       VARCHAR(255),

  -- Discipline (structural | hvac | plumbing | electrical | architecture | other)
  discipline1         VARCHAR(50),
  discipline2         VARCHAR(50),

  -- Clash classification
  clash_type          VARCHAR(20)  NOT NULL DEFAULT 'hard'   CHECK (clash_type IN ('hard','soft','clearance')),
  severity            VARCHAR(20)  NOT NULL DEFAULT 'medium' CHECK (severity    IN ('critical','high','medium','low')),
  status              VARCHAR(20)  NOT NULL DEFAULT 'open'   CHECK (status      IN ('open','review','resolved','accepted')),

  -- Assignment
  assignee_id         UUID        REFERENCES users(id) ON DELETE SET NULL,

  -- Geometry
  location            JSONB,   -- { x, y, z } world-space centroid
  overlap             JSONB,   -- { min:[x,y,z], max:[x,y,z], volume:float }

  -- Notes
  description         TEXT,
  resolution          TEXT,

  -- Scan run tracking (to allow re-scan without losing old results)
  scan_run_id         UUID,

  -- Timestamps
  detected_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  resolved_at         TIMESTAMPTZ,
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS clash_detections_project_id_idx  ON clash_detections (project_id);
CREATE INDEX IF NOT EXISTS clash_detections_tenant_id_idx   ON clash_detections (tenant_id);
CREATE INDEX IF NOT EXISTS clash_detections_status_idx      ON clash_detections (status);
CREATE INDEX IF NOT EXISTS clash_detections_severity_idx    ON clash_detections (severity);
CREATE INDEX IF NOT EXISTS clash_detections_scan_run_id_idx ON clash_detections (scan_run_id);
CREATE INDEX IF NOT EXISTS clash_detections_models_idx      ON clash_detections (model1_id, model2_id);
