-- =====================================================
-- Migration: Add BillingContact Role & Align Billing RLS
-- Add BillingContact as a fifth organization-level role
-- Update billing-related RLS policies to grant BillingContact appropriate access
-- =====================================================

-- Step 1: Drop existing role constraint and recreate with BillingContact
ALTER TABLE public.organization_members
DROP CONSTRAINT IF EXISTS organization_members_role_check;

ALTER TABLE public.organization_members
ADD CONSTRAINT organization_members_role_check 
CHECK (role IN ('SuperAdmin', 'Admin', 'BillingContact', 'Editor', 'Viewer'));

-- Step 2: Update subscriptions RLS policies to include BillingContact
-- Drop existing update policy
DROP POLICY IF EXISTS "Users can update their org subscriptions" ON public.subscriptions;

-- Recreate update policy with BillingContact included
CREATE POLICY "Users can update their org subscriptions"
  ON public.subscriptions 
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = subscriptions.org_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role = ANY (ARRAY['SuperAdmin'::text, 'Admin'::text, 'BillingContact'::text])
    )
  );

-- Step 3: Allow BillingContact to view subscription items
-- The existing view policy already allows all org members, so no change needed
-- But we can make it explicit that BillingContact has billing access in comments

COMMENT ON TABLE public.subscriptions IS 'Stripe subscriptions linked to organizations. SuperAdmin, Admin, and BillingContact can manage.';

-- Step 4: Update discount redemptions view policy (if needed)
-- BillingContact should be able to view redemptions for their org
-- Existing policy already allows all org members to view, so no change needed

-- Step 5: Ensure BillingContact can create subscriptions (optional based on business logic)
-- Currently any org member can create subscriptions via the insert policy
-- Keep this as-is for now, but document that BillingContact has this access

-- Step 6: Add comment documentation for the role
COMMENT ON COLUMN public.organization_members.role IS 'Organization role: SuperAdmin (full access), Admin (manage org & users), BillingContact (manage billing only), Editor (manage DNS), Viewer (read-only)';

-- =====================================================
-- Migration Complete
-- =====================================================

-- Verify the constraint was updated
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conname = 'organization_members_role_check'
  AND conrelid = 'public.organization_members'::regclass;

