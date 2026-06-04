-- =====================================
-- Migration 026: Fix user_sessions — add is_active and user_agent columns
-- =====================================
-- The Drizzle schema declares `is_active` (BOOLEAN) and `user_agent` (TEXT) as
-- distinct columns, but no prior migration created them.
-- auth.service.ts inserts both on every login and refresh → runtime column-not-found error.

ALTER TABLE user_sessions
  ADD COLUMN IF NOT EXISTS is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- Backfill: sessions that are already revoked should have is_active=false
UPDATE user_sessions
   SET is_active = FALSE
 WHERE is_revoked = TRUE AND is_active = TRUE;

-- Populate user_agent from device_info->>'userAgent' where available
UPDATE user_sessions
   SET user_agent = device_info->>'userAgent'
 WHERE user_agent IS NULL
   AND device_info IS NOT NULL
   AND device_info->>'userAgent' IS NOT NULL;
