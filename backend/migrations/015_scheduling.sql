-- ====================================
-- MIGRATION 015: 4D Scheduling
-- Closes drift: src/shared/database/schema/scheduling.ts declared
-- bim_schedules, schedule_tasks, task_element_links, timeline_simulations.
-- Required by 4D simulation feature (BIM model + timeline playback).
-- ====================================

-- =====================================
-- BIM_SCHEDULES (per project)
-- =====================================
CREATE TABLE IF NOT EXISTS bim_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS bim_schedules_project_id_idx ON bim_schedules(project_id);

COMMENT ON TABLE bim_schedules IS '4D construction schedule (project timeline)';

-- =====================================
-- SCHEDULE_TASKS (Gantt activities)
-- =====================================
CREATE TABLE IF NOT EXISTS schedule_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES bim_schedules(id) ON DELETE CASCADE,
  task_name VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  progress INTEGER DEFAULT 0,
  dependencies JSONB,
  is_critical_path BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS schedule_tasks_schedule_id_idx ON schedule_tasks(schedule_id);

COMMENT ON TABLE schedule_tasks IS 'Gantt-style activities with FS/SS/FF/SF dependencies';

-- =====================================
-- TASK_ELEMENT_LINKS (4D: task ↔ IFC element)
-- =====================================
CREATE TABLE IF NOT EXISTS task_element_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES schedule_tasks(id) ON DELETE CASCADE,
  element_id VARCHAR(255) NOT NULL,
  action VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS task_element_links_task_id_idx ON task_element_links(task_id);

COMMENT ON TABLE task_element_links IS 'Binds schedule tasks to IFC GlobalId (construct/demolish/temporary)';

-- =====================================
-- TIMELINE_SIMULATIONS (saved playback snapshots)
-- =====================================
CREATE TABLE IF NOT EXISTS timeline_simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES bim_schedules(id) ON DELETE CASCADE,
  name VARCHAR(255),
  simulation_date DATE NOT NULL,
  snapshot JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS timeline_simulations_schedule_id_idx ON timeline_simulations(schedule_id);

COMMENT ON TABLE timeline_simulations IS 'Frozen 4D playback states (date + visible/hidden/partial element sets)';
