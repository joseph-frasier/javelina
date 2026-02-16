-- Remove foreign key constraint from profiles.id to auth.users
-- This is required for Auth0 integration where users don't exist in auth.users

-- Drop the foreign key constraint
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Keep id as primary key but remove the foreign key reference
-- The id column will now be independent and can be any UUID
-- For Supabase Auth users: id matches auth.users(id) (via trigger)
-- For Auth0 users: id is auto-generated via gen_random_uuid()

COMMENT ON COLUMN profiles.id IS 'Primary key - UUID (matches auth.users.id for Supabase Auth, auto-generated for Auth0)';
