-- =====================================
-- Migration 013: Meeting Collaboration State
-- =====================================
-- Descrição: Persistência de estado CRDT/Yjs para colaboração imersiva
-- Data: 2026-05-11
-- =====================================

CREATE TABLE IF NOT EXISTS meeting_collaboration_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES virtual_meeting_rooms(id) ON DELETE CASCADE,
  ydoc_update JSONB NOT NULL,
  version INTEGER NOT NULL DEFAULT 0,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT meeting_collaboration_snapshots_room_id_unique UNIQUE (room_id)
);

COMMENT ON TABLE meeting_collaboration_snapshots IS 'Snapshot compacto CRDT/Yjs por sala de reunião imersiva';
COMMENT ON COLUMN meeting_collaboration_snapshots.ydoc_update IS 'Update Yjs compactado serializado como array JSON de bytes';
COMMENT ON COLUMN meeting_collaboration_snapshots.version IS 'Última versão de update aplicada na sala';

CREATE INDEX IF NOT EXISTS meeting_collaboration_snapshots_room_id_idx
  ON meeting_collaboration_snapshots(room_id);

CREATE TABLE IF NOT EXISTS meeting_collaboration_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES virtual_meeting_rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  participant_id UUID REFERENCES meeting_participants(id) ON DELETE SET NULL,
  origin VARCHAR(50) NOT NULL DEFAULT 'snapshot',
  ydoc_update JSONB NOT NULL,
  version INTEGER NOT NULL,
  is_snapshot BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT meeting_collaboration_updates_room_version_unique UNIQUE (room_id, version)
);

COMMENT ON TABLE meeting_collaboration_updates IS 'Log append-only de updates CRDT/Yjs para seleção, anotações e cortes em reuniões';
COMMENT ON COLUMN meeting_collaboration_updates.origin IS 'Origem lógica: selection, annotation, section, presence, snapshot';
COMMENT ON COLUMN meeting_collaboration_updates.ydoc_update IS 'Update Yjs incremental serializado como array JSON de bytes';
COMMENT ON COLUMN meeting_collaboration_updates.version IS 'Versão monotônica por sala';
COMMENT ON COLUMN meeting_collaboration_updates.is_snapshot IS 'Indica se o update representa snapshot completo do documento';

CREATE INDEX IF NOT EXISTS meeting_collaboration_updates_room_id_idx
  ON meeting_collaboration_updates(room_id);

CREATE INDEX IF NOT EXISTS meeting_collaboration_updates_room_version_idx
  ON meeting_collaboration_updates(room_id, version);

CREATE INDEX IF NOT EXISTS meeting_collaboration_updates_created_at_idx
  ON meeting_collaboration_updates(created_at DESC);
