-- ====================================
-- MIGRATION 019: Fix notifications tenant_id type
-- ====================================
-- Migration 006 declared notifications.tenant_id (and notification_preferences.tenant_id)
-- as UUID REFERENCES tenants(id). The rest of the codebase consistently uses
-- VARCHAR(255) REFERENCES tenants(tenant_id) (the human-readable slug column).
-- This migration converts the columns to match the convention.
--
-- On existing data: rows whose tenant_id matches a tenants.id UUID are translated
-- to the corresponding tenants.tenant_id slug. Orphan rows (no matching tenant)
-- are left as-is and will fail the FK re-add (intentional: surfaces bad data).
-- ====================================

DO $$
DECLARE
  notif_type TEXT;
  prefs_type TEXT;
BEGIN
  SELECT data_type INTO notif_type
    FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'tenant_id';

  IF notif_type = 'uuid' THEN
    ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_tenant_id_fkey;
    ALTER TABLE notifications
      ALTER COLUMN tenant_id TYPE VARCHAR(255)
      USING COALESCE(
        (SELECT t.tenant_id FROM tenants t WHERE t.id = notifications.tenant_id),
        notifications.tenant_id::text
      );
    ALTER TABLE notifications
      ADD CONSTRAINT notifications_tenant_id_fkey
      FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE;
  END IF;

  SELECT data_type INTO prefs_type
    FROM information_schema.columns
    WHERE table_name = 'notification_preferences' AND column_name = 'tenant_id';

  IF prefs_type = 'uuid' THEN
    ALTER TABLE notification_preferences DROP CONSTRAINT IF EXISTS notification_preferences_tenant_id_fkey;
    ALTER TABLE notification_preferences
      ALTER COLUMN tenant_id TYPE VARCHAR(255)
      USING COALESCE(
        (SELECT t.tenant_id FROM tenants t WHERE t.id = notification_preferences.tenant_id),
        notification_preferences.tenant_id::text
      );
    ALTER TABLE notification_preferences
      ADD CONSTRAINT notification_preferences_tenant_id_fkey
      FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE;
  END IF;
END $$;
