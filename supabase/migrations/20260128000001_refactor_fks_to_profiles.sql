-- Refactor Foreign Keys from auth.users to profiles
-- This migration updates all FK constraints to point to profiles.id instead of auth.users.id
-- This enables Auth0 users to access application functionality

-- =====================================================
-- ORGANIZATIONS TABLE
-- =====================================================

-- Drop old constraint
ALTER TABLE organizations 
DROP CONSTRAINT IF EXISTS organizations_owner_id_fkey;

-- Add new constraint to profiles
ALTER TABLE organizations
ADD CONSTRAINT organizations_owner_id_fkey 
FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_organizations_owner_id ON organizations(owner_id);

-- Update column comment
COMMENT ON COLUMN organizations.owner_id IS 'Organization owner (references profiles.id)';

-- =====================================================
-- ORGANIZATION_MEMBERS TABLE
-- =====================================================

-- Drop old user_id constraint
ALTER TABLE organization_members 
DROP CONSTRAINT IF EXISTS organization_members_user_id_fkey;

-- Add new user_id constraint to profiles
ALTER TABLE organization_members
ADD CONSTRAINT organization_members_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Add index for user_id
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON organization_members(user_id);

-- Drop old invited_by constraint
ALTER TABLE organization_members 
DROP CONSTRAINT IF EXISTS organization_members_invited_by_fkey;

-- Add new invited_by constraint to profiles
ALTER TABLE organization_members
ADD CONSTRAINT organization_members_invited_by_fkey 
FOREIGN KEY (invited_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- Add index for invited_by
CREATE INDEX IF NOT EXISTS idx_organization_members_invited_by ON organization_members(invited_by);

-- Update column comments
COMMENT ON COLUMN organization_members.user_id IS 'User in organization (references profiles.id)';
COMMENT ON COLUMN organization_members.invited_by IS 'User who sent invitation (references profiles.id)';

-- =====================================================
-- ZONES TABLE
-- =====================================================

-- Drop old constraint
ALTER TABLE zones 
DROP CONSTRAINT IF EXISTS zones_created_by_fkey;

-- Add new constraint to profiles
ALTER TABLE zones
ADD CONSTRAINT zones_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_zones_created_by ON zones(created_by);

-- Update column comment
COMMENT ON COLUMN zones.created_by IS 'User who created zone (references profiles.id)';

-- =====================================================
-- ZONE_RECORDS TABLE
-- =====================================================

-- Drop old constraint (may be named dns_records_created_by_fkey)
ALTER TABLE zone_records 
DROP CONSTRAINT IF EXISTS zone_records_created_by_fkey;

ALTER TABLE zone_records 
DROP CONSTRAINT IF EXISTS dns_records_created_by_fkey;

-- Add new constraint to profiles
ALTER TABLE zone_records
ADD CONSTRAINT zone_records_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_zone_records_created_by ON zone_records(created_by);

-- Update column comment
COMMENT ON COLUMN zone_records.created_by IS 'User who created record (references profiles.id)';

-- =====================================================
-- AUDIT_LOGS TABLE
-- =====================================================

-- Drop old constraint
ALTER TABLE audit_logs 
DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;

-- Add new constraint to profiles
ALTER TABLE audit_logs
ADD CONSTRAINT audit_logs_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);

-- Update column comment
COMMENT ON COLUMN audit_logs.user_id IS 'User who performed action (references profiles.id)';

-- =====================================================
-- SUBSCRIPTIONS TABLE
-- =====================================================

-- Drop old constraint
ALTER TABLE subscriptions 
DROP CONSTRAINT IF EXISTS subscriptions_created_by_fkey;

-- Add new constraint to profiles
ALTER TABLE subscriptions
ADD CONSTRAINT subscriptions_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_created_by ON subscriptions(created_by);

-- Update column comment
COMMENT ON COLUMN subscriptions.created_by IS 'User who initiated subscription (references profiles.id)';

-- =====================================================
-- TAGS TABLE
-- =====================================================

-- Drop old constraint
ALTER TABLE tags 
DROP CONSTRAINT IF EXISTS tags_created_by_fkey;

-- Add new constraint to profiles
ALTER TABLE tags
ADD CONSTRAINT tags_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_tags_created_by ON tags(created_by);

-- Update column comment
COMMENT ON COLUMN tags.created_by IS 'User who created tag (references profiles.id)';

-- =====================================================
-- PROMOTION_CODES TABLE
-- =====================================================

-- Drop old constraint
ALTER TABLE promotion_codes 
DROP CONSTRAINT IF EXISTS promotion_codes_created_by_fkey;

-- Add new constraint to profiles
ALTER TABLE promotion_codes
ADD CONSTRAINT promotion_codes_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_promotion_codes_created_by ON promotion_codes(created_by);

-- Update column comment
COMMENT ON COLUMN promotion_codes.created_by IS 'Admin who created promo code (references profiles.id)';

-- =====================================================
-- DISCOUNT_REDEMPTIONS TABLE
-- =====================================================

-- Drop old constraint
ALTER TABLE discount_redemptions 
DROP CONSTRAINT IF EXISTS discount_redemptions_user_id_fkey;

-- Add new constraint to profiles
ALTER TABLE discount_redemptions
ADD CONSTRAINT discount_redemptions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_discount_redemptions_user_id ON discount_redemptions(user_id);

-- Update column comment
COMMENT ON COLUMN discount_redemptions.user_id IS 'User who redeemed code (references profiles.id)';

-- =====================================================
-- SUMMARY
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'FOREIGN KEY REFACTOR COMPLETE';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'All foreign keys now reference profiles.id';
  RAISE NOTICE 'Tables updated:';
  RAISE NOTICE '  - organizations (owner_id)';
  RAISE NOTICE '  - organization_members (user_id, invited_by)';
  RAISE NOTICE '  - zones (created_by)';
  RAISE NOTICE '  - zone_records (created_by)';
  RAISE NOTICE '  - audit_logs (user_id)';
  RAISE NOTICE '  - subscriptions (created_by)';
  RAISE NOTICE '  - tags (created_by)';
  RAISE NOTICE '  - promotion_codes (created_by)';
  RAISE NOTICE '  - discount_redemptions (user_id)';
  RAISE NOTICE '';
  RAISE NOTICE 'Performance indexes created on all FK columns';
  RAISE NOTICE 'Auth0 users can now access application functionality';
END $$;
