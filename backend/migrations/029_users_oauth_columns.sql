-- Migration 029: OAuth columns on users table
-- Allows users to sign in via Google or GitHub.
-- oauth_provider: 'google' | 'github' | null
-- oauth_id: provider-scoped unique user ID

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS oauth_provider VARCHAR(50),
  ADD COLUMN IF NOT EXISTS oauth_id       VARCHAR(255);

-- A given oauth_provider + oauth_id pair must be unique
CREATE UNIQUE INDEX IF NOT EXISTS users_oauth_provider_id_idx
  ON users(oauth_provider, oauth_id)
  WHERE oauth_provider IS NOT NULL;
