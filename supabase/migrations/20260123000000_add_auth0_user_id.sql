-- Add auth0_user_id column to profiles table for Auth0 migration
-- This migration should be applied to the dev branch AFTER frontend/backend implementation is complete

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS auth0_user_id TEXT UNIQUE;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_profiles_auth0_user_id ON profiles(auth0_user_id);

-- Add comment for documentation
COMMENT ON COLUMN profiles.auth0_user_id IS 'Auth0 user ID (e.g., auth0|123456, google-oauth2|123456)';
