-- ====================================
-- MIGRATION 018: Fix ifc_models.uploaded_by FK
-- ====================================
-- Migration 014 created ifc_models.uploaded_by REFERENCES tenants(id),
-- but the column represents the User who uploaded the file.
-- Re-point the FK to users(id) (both are uuid, so column type is unchanged).
-- ====================================

ALTER TABLE ifc_models
  DROP CONSTRAINT IF EXISTS ifc_models_uploaded_by_fkey;

ALTER TABLE ifc_models
  ADD CONSTRAINT ifc_models_uploaded_by_fkey
  FOREIGN KEY (uploaded_by)
  REFERENCES users(id)
  ON DELETE SET NULL;

COMMENT ON COLUMN ifc_models.uploaded_by IS 'User who uploaded this IFC (references users.id)';
