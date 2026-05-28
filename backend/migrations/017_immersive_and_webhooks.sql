-- ====================================
-- MIGRATION 017: Immersive (VR/AR) + Webhook Subscriptions
-- Closes drift for:
--   - src/shared/database/schema/immersive.ts (5 tables)
--   - src/shared/database/schema/tenants.ts -> webhookSubscriptions
-- ====================================

-- =====================================
-- VR_SESSIONS
-- =====================================
CREATE TABLE IF NOT EXISTS vr_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_type VARCHAR(50) NOT NULL,
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMP,
  duration INTEGER,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS vr_sessions_project_id_idx ON vr_sessions(project_id);
CREATE INDEX IF NOT EXISTS vr_sessions_user_id_idx ON vr_sessions(user_id);

COMMENT ON TABLE vr_sessions IS 'VR session telemetry (walkthrough/inspection/meeting)';

-- =====================================
-- AR_MARKERS
-- =====================================
CREATE TABLE IF NOT EXISTS ar_markers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  marker_type VARCHAR(50) NOT NULL,
  marker_data TEXT NOT NULL,
  name VARCHAR(255),
  linked_object_id VARCHAR(255),
  position JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ar_markers_project_id_idx ON ar_markers(project_id);

COMMENT ON TABLE ar_markers IS 'AR markers (qr | aruco | nft) anchored to IFC elements';

-- =====================================
-- SPATIAL_ANCHORS
-- =====================================
CREATE TABLE IF NOT EXISTS spatial_anchors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  anchor_type VARCHAR(50) NOT NULL,
  cloud_anchor_id VARCHAR(255),
  position JSONB,
  rotation JSONB,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS spatial_anchors_project_id_idx ON spatial_anchors(project_id);

COMMENT ON TABLE spatial_anchors IS 'Cloud/local/geospatial anchors for AR persistence';

-- =====================================
-- COLLABORATION_SESSIONS
-- =====================================
CREATE TABLE IF NOT EXISTS collaboration_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  session_name VARCHAR(255),
  participants JSONB,
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS collaboration_sessions_project_id_idx ON collaboration_sessions(project_id);

COMMENT ON TABLE collaboration_sessions IS 'Generic multi-user collab sessions (non-meeting)';

-- =====================================
-- ANNOTATIONS
-- =====================================
CREATE TABLE IF NOT EXISTS annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  element_id VARCHAR(255),
  position JSONB,
  text TEXT,
  type VARCHAR(50),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS annotations_project_id_idx ON annotations(project_id);
CREATE INDEX IF NOT EXISTS annotations_created_by_idx ON annotations(created_by);

COMMENT ON TABLE annotations IS 'Comments/issues/measurements pinned to IFC elements';

-- =====================================
-- WEBHOOK_SUBSCRIPTIONS (tenant + company scoped)
-- =====================================
CREATE TABLE IF NOT EXISTS webhook_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(255) NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  company_id VARCHAR(255) NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  url TEXT NOT NULL,
  secret VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_attempt_at TIMESTAMP,
  last_successful_at TIMESTAMP,
  last_error TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS webhook_subscriptions_company_event_url_idx
  ON webhook_subscriptions(company_id, event_type, url);
CREATE INDEX IF NOT EXISTS webhook_subscriptions_tenant_id_idx ON webhook_subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS webhook_subscriptions_company_id_idx ON webhook_subscriptions(company_id);

COMMENT ON TABLE webhook_subscriptions IS 'Outbound webhook subscriptions per tenant/company/event';
