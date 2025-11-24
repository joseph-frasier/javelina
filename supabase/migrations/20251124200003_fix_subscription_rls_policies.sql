-- =====================================================
-- Fix Subscription RLS Policies
-- Add missing INSERT and UPDATE policies to match dev database
-- =====================================================
-- Issue: Production is missing user INSERT/UPDATE policies for subscriptions
-- This was causing subscription creation to fail for regular authenticated users
-- 
-- Created: 2024-11-24
-- =====================================================

-- Drop existing policies to ensure clean state
DROP POLICY IF EXISTS "Users can view their org subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can create subscriptions for their orgs" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update their org subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON public.subscriptions;

-- =====================================================
-- POLICY 1: Users can view subscriptions for their organizations
-- =====================================================
CREATE POLICY "Users can view their org subscriptions"
  ON public.subscriptions 
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = subscriptions.org_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- =====================================================
-- POLICY 2: Users can create subscriptions for their organizations
-- =====================================================
CREATE POLICY "Users can create subscriptions for their orgs"
  ON public.subscriptions 
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = subscriptions.org_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- =====================================================
-- POLICY 3: Admins can update their org subscriptions
-- =====================================================
CREATE POLICY "Users can update their org subscriptions"
  ON public.subscriptions 
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = subscriptions.org_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role = ANY (ARRAY['SuperAdmin'::text, 'Admin'::text])
    )
  );

-- =====================================================
-- POLICY 4: Service role can manage all subscriptions (for webhooks)
-- =====================================================
CREATE POLICY "Service role can manage subscriptions"
  ON public.subscriptions 
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- =====================================================
-- VERIFY POLICIES EXIST
-- =====================================================
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  -- Count policies on subscriptions table
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'subscriptions';
  
  IF policy_count < 4 THEN
    RAISE EXCEPTION 'Expected 4 policies on subscriptions table, found %', policy_count;
  END IF;
  
  -- Verify each specific policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'subscriptions' 
    AND policyname = 'Users can view their org subscriptions'
  ) THEN
    RAISE EXCEPTION 'Missing policy: Users can view their org subscriptions';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'subscriptions' 
    AND policyname = 'Users can create subscriptions for their orgs'
  ) THEN
    RAISE EXCEPTION 'Missing policy: Users can create subscriptions for their orgs';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'subscriptions' 
    AND policyname = 'Users can update their org subscriptions'
  ) THEN
    RAISE EXCEPTION 'Missing policy: Users can update their org subscriptions';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'subscriptions' 
    AND policyname = 'Service role can manage subscriptions'
  ) THEN
    RAISE EXCEPTION 'Missing policy: Service role can manage subscriptions';
  END IF;
  
  RAISE NOTICE 'Successfully created all 4 subscription RLS policies';
  RAISE NOTICE 'Production database now matches dev database RLS configuration';
END $$;

-- =====================================================
-- END OF MIGRATION
-- =====================================================

