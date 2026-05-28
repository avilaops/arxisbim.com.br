-- ====================================
-- MIGRATION 016: Virtual Meetings (core tables)
-- Closes drift: src/shared/database/schema/virtual-meetings.ts declared
-- 5 tables (rooms, participants, chat, actions, recordings) without SQL.
-- Note: meeting_collaboration_snapshots and meeting_collaboration_updates
-- were already created by migration 013. They reference virtual_meeting_rooms,
-- so on fresh DBs migration 013 will only succeed AFTER 016. Existing DBs
-- already have all 7 tables.
-- ====================================

-- =====================================
-- VIRTUAL_MEETING_ROOMS
-- =====================================
CREATE TABLE IF NOT EXISTS virtual_meeting_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  room_url VARCHAR(255) NOT NULL UNIQUE,
  meeting_code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255),
  created_by UUID NOT NULL REFERENCES users(id),
  avatar_settings JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS virtual_meeting_rooms_project_id_idx ON virtual_meeting_rooms(project_id);
CREATE INDEX IF NOT EXISTS virtual_meeting_rooms_created_by_idx ON virtual_meeting_rooms(created_by);

COMMENT ON TABLE virtual_meeting_rooms IS 'Immersive BIM review rooms (URL + 6-digit code)';

-- =====================================
-- MEETING_PARTICIPANTS (avatars in room)
-- =====================================
CREATE TABLE IF NOT EXISTS meeting_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES virtual_meeting_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  user_name VARCHAR(255) NOT NULL,
  avatar_state JSONB,
  joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
  left_at TIMESTAMP,
  last_seen_at TIMESTAMP,
  is_connected BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS meeting_participants_room_id_idx ON meeting_participants(room_id);
CREATE INDEX IF NOT EXISTS meeting_participants_user_id_idx ON meeting_participants(user_id);

COMMENT ON TABLE meeting_participants IS 'Avatar state per user per meeting room';

-- =====================================
-- MEETING_CHAT_MESSAGES
-- =====================================
CREATE TABLE IF NOT EXISTS meeting_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES virtual_meeting_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  user_name VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  message_type VARCHAR(50) DEFAULT 'text',
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS meeting_chat_messages_room_id_idx ON meeting_chat_messages(room_id);

COMMENT ON TABLE meeting_chat_messages IS 'In-room chat log';

-- =====================================
-- MEETING_ACTIONS (laser pointer, annotations, highlights)
-- =====================================
CREATE TABLE IF NOT EXISTS meeting_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES virtual_meeting_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  action_type VARCHAR(50) NOT NULL,
  action_data JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS meeting_actions_room_id_idx ON meeting_actions(room_id);

COMMENT ON TABLE meeting_actions IS 'Spatial actions: laser_pointer, annotation, highlight';

-- =====================================
-- MEETING_RECORDINGS
-- =====================================
CREATE TABLE IF NOT EXISTS meeting_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES virtual_meeting_rooms(id) ON DELETE CASCADE,
  recording_url TEXT,
  duration INTEGER,
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS meeting_recordings_room_id_idx ON meeting_recordings(room_id);

COMMENT ON TABLE meeting_recordings IS 'Session recordings (URL + duration)';
