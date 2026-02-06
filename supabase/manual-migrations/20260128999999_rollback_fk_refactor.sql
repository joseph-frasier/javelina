-- ROLLBACK MIGRATION: Revert FK Refactor from profiles back to auth.users
-- ⚠️ USE THIS ONLY IF THE FK REFACTOR CAUSES ISSUES ⚠️
-- This will restore all foreign keys to reference auth.users.id instead of profiles.id

-- =====================================================
-- ORGANIZATIONS TABLE
-- =====================================================

ALTER TABLE organizations 
DROP CONSTRAINT IF EXISTS organizations_owner_id_fkey;

ALTER TABLE organizations
ADD CONSTRAINT organizations_owner_id_fkey 
FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN organizations.owner_id IS 'Organization owner (references auth.users.id)';

-- =====================================================
-- ORGANIZATION_MEMBERS TABLE
-- =====================================================

ALTER TABLE organization_members 
DROP CONSTRAINT IF EXISTS organization_members_user_id_fkey;

ALTER TABLE organization_members
ADD CONSTRAINT organization_members_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE organization_members 
DROP CONSTRAINT IF EXISTS organization_members_invited_by_fkey;

ALTER TABLE organization_members
ADD CONSTRAINT organization_members_invited_by_fkey 
FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN organization_members.user_id IS 'User in organization (references auth.users.id)';
COMMENT ON COLUMN organization_members.invited_by IS 'User who sent invitation (references auth.users.id)';

-- =====================================================
-- ZONES TABLE
-- =====================================================

ALTER TABLE zones 
DROP CONSTRAINT IF EXISTS zones_created_by_fkey;

ALTER TABLE zones
ADD CONSTRAINT zones_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN zones.created_by IS 'User who created zone (references auth.users.id)';

-- =====================================================
-- ZONE_RECORDS TABLE
-- =====================================================

ALTER TABLE zone_records 
DROP CONSTRAINT IF EXISTS zone_records_created_by_fkey;

-- Restore original constraint name if needed
ALTER TABLE zone_records
ADD CONSTRAINT dns_records_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN zone_records.created_by IS 'User who created record (references auth.users.id)';

-- =====================================================
-- AUDIT_LOGS TABLE
-- =====================================================

ALTER TABLE audit_logs 
DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;

ALTER TABLE audit_logs
ADD CONSTRAINT audit_logs_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN audit_logs.user_id IS 'User who performed action (references auth.users.id)';

-- =====================================================
-- SUBSCRIPTIONS TABLE
-- =====================================================

ALTER TABLE subscriptions 
DROP CONSTRAINT IF EXISTS subscriptions_created_by_fkey;

ALTER TABLE subscriptions
ADD CONSTRAINT subscriptions_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN subscriptions.created_by IS 'User who initiated subscription (references auth.users.id)';

-- =====================================================
-- TAGS TABLE
-- =====================================================

ALTER TABLE tags 
DROP CONSTRAINT IF EXISTS tags_created_by_fkey;

ALTER TABLE tags
ADD CONSTRAINT tags_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN tags.created_by IS 'User who created tag (references auth.users.id)';

-- =====================================================
-- PROMOTION_CODES TABLE
-- =====================================================

ALTER TABLE promotion_codes 
DROP CONSTRAINT IF EXISTS promotion_codes_created_by_fkey;

ALTER TABLE promotion_codes
ADD CONSTRAINT promotion_codes_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN promotion_codes.created_by IS 'Admin who created promo code (references auth.users.id)';

-- =====================================================
-- DISCOUNT_REDEMPTIONS TABLE
-- =====================================================

ALTER TABLE discount_redemptions 
DROP CONSTRAINT IF EXISTS discount_redemptions_user_id_fkey;

ALTER TABLE discount_redemptions
ADD CONSTRAINT discount_redemptions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

COMMENT ON COLUMN discount_redemptions.user_id IS 'User who redeemed code (references auth.users.id)';

-- =====================================================
-- SUMMARY
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE '⚠️  ROLLBACK COMPLETE ⚠️';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'All foreign keys reverted to reference auth.users.id';
  RAISE NOTICE '';
  RAISE NOTICE 'WARNING: Auth0 users will NOT have access to app functionality';
  RAISE NOTICE 'This rollback should only be used for emergency recovery';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables reverted:';
  RAISE NOTICE '  - organizations (owner_id)';
  RAISE NOTICE '  - organization_members (user_id, invited_by)';
  RAISE NOTICE '  - zones (created_by)';
  RAISE NOTICE '  - zone_records (created_by)';
  RAISE NOTICE '  - audit_logs (user_id)';
  RAISE NOTICE '  - subscriptions (created_by)';
  RAISE NOTICE '  - tags (created_by)';
  RAISE NOTICE '  - promotion_codes (created_by)';
  RAISE NOTICE '  - discount_redemptions (user_id)';
END $$;
