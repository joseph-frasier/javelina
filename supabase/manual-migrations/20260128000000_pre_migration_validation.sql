-- Pre-Migration Validation for FK Refactor to profiles.id
-- This script validates data integrity before refactoring foreign keys
-- Run this first to identify any issues that need to be addressed

-- =====================================================
-- 1. VERIFY ALL auth.users HAVE CORRESPONDING PROFILES
-- =====================================================

DO $$
DECLARE
  missing_profiles_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO missing_profiles_count
  FROM auth.users au
  WHERE NOT EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = au.id
  );
  
  IF missing_profiles_count > 0 THEN
    RAISE NOTICE 'WARNING: % auth.users records have no corresponding profile', missing_profiles_count;
    RAISE NOTICE 'Query to see missing profiles: SELECT id, email FROM auth.users WHERE id NOT IN (SELECT id FROM profiles);';
  ELSE
    RAISE NOTICE 'SUCCESS: All auth.users have corresponding profiles';
  END IF;
END $$;

-- =====================================================
-- 2. CHECK FOR ORPHANED FOREIGN KEY REFERENCES
-- =====================================================

-- Check organizations.owner_id
DO $$
DECLARE
  orphaned_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphaned_count
  FROM organizations o
  WHERE o.owner_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = o.owner_id);
  
  IF orphaned_count > 0 THEN
    RAISE WARNING 'ISSUE: % organizations have owner_id not in profiles', orphaned_count;
    RAISE NOTICE 'Query: SELECT id, name, owner_id FROM organizations WHERE owner_id IS NOT NULL AND owner_id NOT IN (SELECT id FROM profiles);';
  ELSE
    RAISE NOTICE 'OK: organizations.owner_id - all references valid';
  END IF;
END $$;

-- Check organization_members.user_id
DO $$
DECLARE
  orphaned_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphaned_count
  FROM organization_members om
  WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = om.user_id);
  
  IF orphaned_count > 0 THEN
    RAISE WARNING 'ISSUE: % organization_members have user_id not in profiles', orphaned_count;
  ELSE
    RAISE NOTICE 'OK: organization_members.user_id - all references valid';
  END IF;
END $$;

-- Check organization_members.invited_by
DO $$
DECLARE
  orphaned_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphaned_count
  FROM organization_members om
  WHERE om.invited_by IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = om.invited_by);
  
  IF orphaned_count > 0 THEN
    RAISE WARNING 'ISSUE: % organization_members have invited_by not in profiles', orphaned_count;
  ELSE
    RAISE NOTICE 'OK: organization_members.invited_by - all references valid';
  END IF;
END $$;

-- Check zones.created_by
DO $$
DECLARE
  orphaned_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphaned_count
  FROM zones z
  WHERE z.created_by IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = z.created_by);
  
  IF orphaned_count > 0 THEN
    RAISE WARNING 'ISSUE: % zones have created_by not in profiles', orphaned_count;
  ELSE
    RAISE NOTICE 'OK: zones.created_by - all references valid';
  END IF;
END $$;

-- Check zone_records.created_by
DO $$
DECLARE
  orphaned_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphaned_count
  FROM zone_records zr
  WHERE zr.created_by IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = zr.created_by);
  
  IF orphaned_count > 0 THEN
    RAISE WARNING 'ISSUE: % zone_records have created_by not in profiles', orphaned_count;
  ELSE
    RAISE NOTICE 'OK: zone_records.created_by - all references valid';
  END IF;
END $$;

-- Check audit_logs.user_id
DO $$
DECLARE
  orphaned_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphaned_count
  FROM audit_logs al
  WHERE al.user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = al.user_id);
  
  IF orphaned_count > 0 THEN
    RAISE WARNING 'ISSUE: % audit_logs have user_id not in profiles', orphaned_count;
  ELSE
    RAISE NOTICE 'OK: audit_logs.user_id - all references valid';
  END IF;
END $$;

-- Check subscriptions.created_by
DO $$
DECLARE
  orphaned_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphaned_count
  FROM subscriptions s
  WHERE s.created_by IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = s.created_by);
  
  IF orphaned_count > 0 THEN
    RAISE WARNING 'ISSUE: % subscriptions have created_by not in profiles', orphaned_count;
  ELSE
    RAISE NOTICE 'OK: subscriptions.created_by - all references valid';
  END IF;
END $$;

-- Check tags.created_by
DO $$
DECLARE
  orphaned_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphaned_count
  FROM tags t
  WHERE t.created_by IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = t.created_by);
  
  IF orphaned_count > 0 THEN
    RAISE WARNING 'ISSUE: % tags have created_by not in profiles', orphaned_count;
  ELSE
    RAISE NOTICE 'OK: tags.created_by - all references valid';
  END IF;
END $$;

-- Check promotion_codes.created_by
DO $$
DECLARE
  orphaned_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphaned_count
  FROM promotion_codes pc
  WHERE pc.created_by IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = pc.created_by);
  
  IF orphaned_count > 0 THEN
    RAISE WARNING 'ISSUE: % promotion_codes have created_by not in profiles', orphaned_count;
  ELSE
    RAISE NOTICE 'OK: promotion_codes.created_by - all references valid';
  END IF;
END $$;

-- Check discount_redemptions.user_id
DO $$
DECLARE
  orphaned_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphaned_count
  FROM discount_redemptions dr
  WHERE dr.user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = dr.user_id);
  
  IF orphaned_count > 0 THEN
    RAISE WARNING 'ISSUE: % discount_redemptions have user_id not in profiles', orphaned_count;
  ELSE
    RAISE NOTICE 'OK: discount_redemptions.user_id - all references valid';
  END IF;
END $$;

-- =====================================================
-- 3. SUMMARY
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'PRE-MIGRATION VALIDATION COMPLETE';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Review any WARNING or ISSUE messages above.';
  RAISE NOTICE 'If all checks passed, proceed with FK refactor migration.';
  RAISE NOTICE 'If issues found, fix orphaned records before proceeding.';
END $$;
