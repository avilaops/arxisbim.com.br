-- =====================================
-- Migration 009: Fix Notification Tenant IDs
-- =====================================
-- Alinha notifications.tenant_id e notification_preferences.tenant_id
-- com o padrão multi-tenant do backend: tenants.tenant_id (varchar)
-- =====================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'notifications'
      AND column_name = 'tenant_id'
      AND data_type = 'uuid'
  ) THEN
    ALTER TABLE notifications ADD COLUMN tenant_id_text VARCHAR(255);

    UPDATE notifications n
    SET tenant_id_text = COALESCE(
      (SELECT t.tenant_id FROM tenants t WHERE t.id = n.tenant_id),
      n.tenant_id::TEXT
    );

    ALTER TABLE notifications ALTER COLUMN tenant_id_text SET NOT NULL;
    ALTER TABLE notifications DROP COLUMN tenant_id CASCADE;
    ALTER TABLE notifications RENAME COLUMN tenant_id_text TO tenant_id;
    ALTER TABLE notifications
      ADD CONSTRAINT notifications_tenant_id_fkey
      FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE;

    RAISE NOTICE 'notifications.tenant_id converted from UUID to VARCHAR tenant slug';
  ELSE
    RAISE NOTICE 'notifications.tenant_id is already aligned or table does not exist';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'notification_preferences'
      AND column_name = 'tenant_id'
      AND data_type = 'uuid'
  ) THEN
    ALTER TABLE notification_preferences ADD COLUMN tenant_id_text VARCHAR(255);

    UPDATE notification_preferences np
    SET tenant_id_text = COALESCE(
      (SELECT t.tenant_id FROM tenants t WHERE t.id = np.tenant_id),
      np.tenant_id::TEXT
    );

    ALTER TABLE notification_preferences ALTER COLUMN tenant_id_text SET NOT NULL;
    ALTER TABLE notification_preferences DROP COLUMN tenant_id CASCADE;
    ALTER TABLE notification_preferences RENAME COLUMN tenant_id_text TO tenant_id;
    ALTER TABLE notification_preferences
      ADD CONSTRAINT notification_preferences_tenant_id_fkey
      FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE;

    RAISE NOTICE 'notification_preferences.tenant_id converted from UUID to VARCHAR tenant slug';
  ELSE
    RAISE NOTICE 'notification_preferences.tenant_id is already aligned or table does not exist';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS notifications_tenant_id_idx ON notifications(tenant_id);
CREATE INDEX IF NOT EXISTS notification_prefs_tenant_id_idx ON notification_preferences(tenant_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE indexname = 'notification_preferences_user_tenant_type_unique_idx'
  ) THEN
    CREATE UNIQUE INDEX notification_preferences_user_tenant_type_unique_idx
      ON notification_preferences(user_id, tenant_id, notification_type);
  END IF;
END $$;

COMMENT ON COLUMN notifications.tenant_id IS 'Tenant slug/reference to tenants.tenant_id';
COMMENT ON COLUMN notification_preferences.tenant_id IS 'Tenant slug/reference to tenants.tenant_id';
