-- S17: Shared links and project members tables for sharing and permissions

CREATE TABLE IF NOT EXISTS shared_links (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token        VARCHAR(64) UNIQUE NOT NULL,
  project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  scenario_id  UUID REFERENCES scenarios(id) ON DELETE CASCADE,
  access_level VARCHAR(20) NOT NULL,
  expires_at   TIMESTAMP,
  created_by   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  revoked_at   TIMESTAMP,
  view_count   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMP NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS shared_links_token_uidx ON shared_links(token);
CREATE INDEX IF NOT EXISTS shared_links_project_id_idx ON shared_links(project_id);
CREATE INDEX IF NOT EXISTS shared_links_scenario_id_idx ON shared_links(scenario_id);

CREATE TABLE IF NOT EXISTS project_members (
  project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role         VARCHAR(20) NOT NULL,
  invited_at   TIMESTAMP,
  accepted_at  TIMESTAMP,
  PRIMARY KEY (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS project_members_project_id_idx ON project_members(project_id);
CREATE INDEX IF NOT EXISTS project_members_user_id_idx ON project_members(user_id);
