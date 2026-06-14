-- S13: PropertySets por elemento. JSONB GIN p/ busca (S15) + quantidades
-- indexadas (S20/S22). Aditivo, reversível (drop table).

CREATE TABLE IF NOT EXISTS element_properties (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_version_id  UUID NOT NULL REFERENCES model_versions(id) ON DELETE CASCADE,
  express_id        INTEGER NOT NULL,
  global_id         VARCHAR(22) NOT NULL,
  ifc_type          VARCHAR(100),
  name              VARCHAR(500),
  storey_id         INTEGER,
  area_m2           DECIMAL(12,4),
  volume_m3         DECIMAL(12,4),
  length_m          DECIMAL(12,4),
  properties        JSONB NOT NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS element_properties_props_gin_idx ON element_properties USING GIN (properties);
CREATE INDEX IF NOT EXISTS element_properties_model_type_idx ON element_properties (model_version_id, ifc_type);
CREATE INDEX IF NOT EXISTS element_properties_model_storey_idx ON element_properties (model_version_id, storey_id);
CREATE INDEX IF NOT EXISTS element_properties_model_express_idx ON element_properties (model_version_id, express_id);
