-- Fix profiles.id column to auto-generate UUIDs
-- This is required for Auth0 user creation to work properly

ALTER TABLE profiles 
ALTER COLUMN id SET DEFAULT gen_random_uuid();

COMMENT ON COLUMN profiles.id IS 'Primary key - auto-generated UUID';
