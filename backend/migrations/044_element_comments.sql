-- S16: Element comments table with 3-tier anchor support and threads.

CREATE TABLE IF NOT EXISTS element_comments (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id         UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  model_version_id   UUID REFERENCES model_versions(id) ON DELETE SET NULL,
  global_id          VARCHAR(22),
  world_position     JSONB,
  body               TEXT NOT NULL,
  parent_id          UUID REFERENCES element_comments(id) ON DELETE CASCADE,
  author_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_resolved        BOOLEAN NOT NULL DEFAULT false,
  resolved_by        UUID REFERENCES users(id) ON DELETE SET NULL,
  resolved_at        TIMESTAMP,
  created_at         TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS element_comments_project_id_idx ON element_comments(project_id);
CREATE INDEX IF NOT EXISTS element_comments_global_id_idx ON element_comments(global_id);
CREATE INDEX IF NOT EXISTS element_comments_parent_id_idx ON element_comments(parent_id);
