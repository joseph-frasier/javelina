-- =====================================================
-- Add last_activity Column to Profiles
-- =====================================================
--
-- Moves session activity tracking from the JWT cookie
-- to the database. This fixes an issue where cross-origin
-- Set-Cookie headers were silently rejected by browsers,
-- causing lastActivity in the JWT to never update and
-- sessions to expire despite active usage.
-- =====================================================

-- Add the column, defaulting existing rows to now()
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_activity timestamptz DEFAULT now();

-- Backfill: set last_activity = last_login for existing users
-- so that currently-active users aren't immediately timed out
UPDATE profiles
  SET last_activity = COALESCE(last_login, created_at, now())
  WHERE last_activity IS NULL;

-- Add NOT NULL constraint after backfill
ALTER TABLE profiles
  ALTER COLUMN last_activity SET NOT NULL;

-- Index for efficient inactivity queries (e.g. cleanup jobs)
CREATE INDEX IF NOT EXISTS idx_profiles_last_activity
  ON profiles (last_activity);
