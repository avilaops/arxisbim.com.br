-- ====================================
-- MIGRATION 050: 4D BIM Scheduling
-- ====================================

CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  scenario_id UUID REFERENCES scenarios(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  source VARCHAR(20) NOT NULL DEFAULT 'manual', -- 'manual' | 'csv' | 'msp' | 'primavera'
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS schedules_project_id_idx ON schedules(project_id);
CREATE INDEX IF NOT EXISTS schedules_scenario_id_idx ON schedules(scenario_id);

CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  external_id VARCHAR(100),
  name VARCHAR(500) NOT NULL,
  planned_start DATE NOT NULL,
  planned_end DATE NOT NULL,
  actual_start DATE,
  actual_end DATE,
  duration_days INT GENERATED ALWAYS AS (planned_end - planned_start) STORED,
  percent_complete DECIMAL(5,2) DEFAULT 0.00,
  wbs_code VARCHAR(100),
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS activities_schedule_id_idx ON activities(schedule_id);
CREATE INDEX IF NOT EXISTS activities_external_id_idx ON activities(external_id);

CREATE TABLE IF NOT EXISTS activity_predecessors (
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  predecessor_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  lag_days INT DEFAULT 0,
  type VARCHAR(10) DEFAULT 'FS', -- FS, FF, SS, SF
  PRIMARY KEY (activity_id, predecessor_id)
);

CREATE TABLE IF NOT EXISTS activity_elements (
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  global_id VARCHAR(22) NOT NULL,
  state_during VARCHAR(20) DEFAULT 'active', -- 'active' | 'temporary' | 'removed'
  PRIMARY KEY (activity_id, global_id)
);
