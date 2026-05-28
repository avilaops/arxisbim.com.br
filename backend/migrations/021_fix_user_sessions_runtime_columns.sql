-- =====================================
-- Migration 021: Fix user_sessions runtime columns
-- =====================================
-- Aligns existing user_sessions table with the auth runtime insert/select shape.
-- =====================================

ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP;
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP;
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS is_revoked BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP;
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS device_info JSONB;
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS access_token_jti VARCHAR(255);

CREATE INDEX IF NOT EXISTS user_sessions_is_revoked_idx ON user_sessions(is_revoked);
