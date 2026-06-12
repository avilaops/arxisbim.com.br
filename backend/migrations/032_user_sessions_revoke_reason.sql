-- Migration 032: add revoke_reason to user_sessions
-- Distinguishes token rotation reuse (attack signal) from explicit logout.
-- 'rotation' = old token reused after refresh → nuke all sessions
-- 'logout'   = explicit logout → just reject, no nuke
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS revoke_reason VARCHAR(50);
