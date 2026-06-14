-- S14: override de taxonomia de tipos por projeto. JSONB opaco — mudar a
-- classificação NÃO exige migração de dados, só atualizar o mapa. Aditivo.

ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_type_map JSONB;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS type_map_version INTEGER NOT NULL DEFAULT 1;
