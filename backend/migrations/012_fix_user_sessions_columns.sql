-- Migration 012: Fix user_sessions missing columns
--
-- The Drizzle schema in `observability.ts` declares `last_used_at`, `ip_address`
-- and `is_revoked` on `user_sessions`, but migration 002 only created
-- `last_activity_at` and `revoked_at`. This drift makes /api/v1/auth/register
-- and /login fail with `column "last_used_at" of relation "user_sessions"
-- does not exist`.
--
-- This migration is idempotent and only adds the missing columns/index.

ALTER TABLE user_sessions
  ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS ip_address  VARCHAR(255),
  ADD COLUMN IF NOT EXISTS is_revoked  BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill last_used_at from last_activity_at when present
UPDATE user_sessions
   SET last_used_at = COALESCE(last_used_at, last_activity_at);

-- Backfill is_revoked from revoked_at when present
UPDATE user_sessions
   SET is_revoked = TRUE
 WHERE revoked_at IS NOT NULL AND is_revoked = FALSE;

-- Composite index for active-session lookups (matches Drizzle index name)
CREATE INDEX IF NOT EXISTS user_sessions_user_active_idx
  ON user_sessions (user_id, is_revoked, expires_at);
