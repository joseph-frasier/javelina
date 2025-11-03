-- =====================================================
-- Javelina Billing Schema v2 - Entitlements-Based
-- Organization-Based Subscriptions with Stripe
-- =====================================================

-- =====================================================
-- 1. UPDATE ORGANIZATIONS TABLE
-- =====================================================

-- Add Stripe customer ID and cached counts to existing organizations table
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS environments_count INTEGER DEFAULT 0;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer 
ON public.organizations(stripe_customer_id);

COMMENT ON COLUMN public.organizations.stripe_customer_id IS 'Stripe Customer ID for billing';
COMMENT ON COLUMN public.organizations.environments_count IS 'Cached count of environments (for quick limit checks)';

-- =====================================================
-- 1B. UPDATE ENVIRONMENTS TABLE
-- =====================================================

-- Add cached zone count to environments table
ALTER TABLE public.environments
ADD COLUMN IF NOT EXISTS zones_count INTEGER DEFAULT 0;

COMMENT ON COLUMN public.environments.zones_count IS 'Cached count of zones in this environment (for quick limit checks)';

-- =====================================================
-- 2. PLANS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  stripe_product_id TEXT,
  billing_interval TEXT CHECK (billing_interval IN ('month', 'year')),
  metadata JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- RLS: Anyone can view active plans (for pricing page)
CREATE POLICY "Anyone can view active plans"
  ON public.plans FOR SELECT
  USING (is_active = true);

COMMENT ON TABLE public.plans IS 'Subscription plans that map to Stripe Products';
COMMENT ON COLUMN public.plans.code IS 'Unique plan identifier (e.g., free, pro, enterprise)';
COMMENT ON COLUMN public.plans.stripe_product_id IS 'Stripe Product ID for this plan';
COMMENT ON COLUMN public.plans.billing_interval IS 'Billing cycle: month or year';

-- =====================================================
-- 3. ENTITLEMENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.entitlements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  description TEXT,
  value_type TEXT NOT NULL CHECK (value_type IN ('boolean', 'numeric', 'text')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;

-- RLS: Anyone can view entitlements (for feature discovery)
CREATE POLICY "Anyone can view entitlements"
  ON public.entitlements FOR SELECT
  USING (true);

COMMENT ON TABLE public.entitlements IS 'Available capabilities and limits that can be assigned to plans';
COMMENT ON COLUMN public.entitlements.key IS 'Unique entitlement key (e.g., environments_limit, api_access)';
COMMENT ON COLUMN public.entitlements.value_type IS 'Data type for this entitlement: boolean, numeric, or text';

-- =====================================================
-- 4. PLAN_ENTITLEMENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.plan_entitlements (
  plan_id UUID REFERENCES public.plans(id) ON DELETE CASCADE NOT NULL,
  entitlement_id UUID REFERENCES public.entitlements(id) ON DELETE CASCADE NOT NULL,
  value TEXT NOT NULL,
  PRIMARY KEY (plan_id, entitlement_id)
);

-- Enable RLS
ALTER TABLE public.plan_entitlements ENABLE ROW LEVEL SECURITY;

-- RLS: Anyone can view plan entitlements (public info)
CREATE POLICY "Anyone can view plan entitlements"
  ON public.plan_entitlements FOR SELECT
  USING (true);

COMMENT ON TABLE public.plan_entitlements IS 'Maps entitlements to plans with their values';
COMMENT ON COLUMN public.plan_entitlements.value IS 'Value for this entitlement (numeric limit, boolean, or text)';

-- =====================================================
-- 5. SUBSCRIPTIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'incomplete' CHECK (
    status IN (
      'trialing', 'active', 'past_due', 'unpaid', 'canceled',
      'incomplete', 'incomplete_expired', 'paused'
    )
  ),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  cancel_at TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view subscriptions for their organizations
CREATE POLICY "Users can view their org subscriptions"
  ON public.subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = subscriptions.org_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- RLS: Service role can manage all subscriptions (for webhooks)
CREATE POLICY "Service role can manage subscriptions"
  ON public.subscriptions FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_org_id 
  ON public.subscriptions(org_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id 
  ON public.subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status 
  ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id 
  ON public.subscriptions(plan_id);

COMMENT ON TABLE public.subscriptions IS 'Stripe subscriptions linked to organizations';
COMMENT ON COLUMN public.subscriptions.org_id IS 'One subscription per organization';
COMMENT ON COLUMN public.subscriptions.stripe_subscription_id IS 'Stripe Subscription ID';
COMMENT ON COLUMN public.subscriptions.status IS 'Mirrors Stripe subscription status';
COMMENT ON COLUMN public.subscriptions.created_by IS 'User who initiated the subscription';

-- =====================================================
-- 6. SUBSCRIPTION_ITEMS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.subscription_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE CASCADE NOT NULL,
  stripe_price_id TEXT NOT NULL,
  quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscription_items ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view items for their org subscriptions
CREATE POLICY "Users can view their subscription items"
  ON public.subscription_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.subscriptions s
      JOIN public.organization_members om ON om.organization_id = s.org_id
      WHERE s.id = subscription_items.subscription_id
      AND om.user_id = auth.uid()
    )
  );

-- RLS: Service role can manage all items
CREATE POLICY "Service role can manage subscription items"
  ON public.subscription_items FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Index
CREATE INDEX IF NOT EXISTS idx_subscription_items_subscription_id 
  ON public.subscription_items(subscription_id);

COMMENT ON TABLE public.subscription_items IS 'Line items for subscriptions (seats, add-ons)';
COMMENT ON COLUMN public.subscription_items.stripe_price_id IS 'Stripe Price ID for this item';
COMMENT ON COLUMN public.subscription_items.quantity IS 'Quantity of this item (e.g., number of seats)';

-- =====================================================
-- 7. ORG_ENTITLEMENT_OVERRIDES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.org_entitlement_overrides (
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  entitlement_id UUID REFERENCES public.entitlements(id) ON DELETE CASCADE NOT NULL,
  value TEXT NOT NULL,
  reason TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (org_id, entitlement_id)
);

-- Enable RLS
ALTER TABLE public.org_entitlement_overrides ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view overrides for their organizations
CREATE POLICY "Users can view their org overrides"
  ON public.org_entitlement_overrides FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = org_entitlement_overrides.org_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- RLS: Only admins can modify overrides
CREATE POLICY "Admins can manage org overrides"
  ON public.org_entitlement_overrides FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = org_entitlement_overrides.org_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role = 'Admin'
    )
  );

-- Index
CREATE INDEX IF NOT EXISTS idx_org_overrides_org_id 
  ON public.org_entitlement_overrides(org_id);

COMMENT ON TABLE public.org_entitlement_overrides IS 'Custom entitlement values for specific organizations';
COMMENT ON COLUMN public.org_entitlement_overrides.reason IS 'Why this override was created (e.g., custom deal)';

-- =====================================================
-- 8. UPDATE TIMESTAMP TRIGGERS
-- =====================================================

-- Trigger for plans
DROP TRIGGER IF EXISTS plans_updated_at ON public.plans;
CREATE TRIGGER plans_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger for subscriptions
DROP TRIGGER IF EXISTS subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger for subscription_items
DROP TRIGGER IF EXISTS subscription_items_updated_at ON public.subscription_items;
CREATE TRIGGER subscription_items_updated_at
  BEFORE UPDATE ON public.subscription_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger for org_entitlement_overrides
DROP TRIGGER IF EXISTS org_overrides_updated_at ON public.org_entitlement_overrides;
CREATE TRIGGER org_overrides_updated_at
  BEFORE UPDATE ON public.org_entitlement_overrides
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- 9. HELPER FUNCTIONS
-- =====================================================

-- Function: Get active subscription for an organization
CREATE OR REPLACE FUNCTION public.get_org_subscription(org_uuid UUID)
RETURNS TABLE (
  subscription_id UUID,
  stripe_subscription_id TEXT,
  plan_code TEXT,
  plan_name TEXT,
  status TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.stripe_subscription_id,
    p.code,
    p.name,
    s.status,
    s.current_period_start,
    s.current_period_end,
    s.trial_end,
    s.cancel_at_period_end
  FROM public.subscriptions s
  LEFT JOIN public.plans p ON p.id = s.plan_id
  WHERE s.org_id = org_uuid;
END;
$$;

COMMENT ON FUNCTION public.get_org_subscription IS 'Get active subscription details for an organization';

-- Function: Get all entitlements for an organization (with overrides)
CREATE OR REPLACE FUNCTION public.get_org_entitlements(org_uuid UUID)
RETURNS TABLE (
  entitlement_key TEXT,
  entitlement_description TEXT,
  value TEXT,
  value_type TEXT,
  is_override BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  -- First, get overrides
  SELECT 
    e.key,
    e.description,
    o.value,
    e.value_type,
    true AS is_override
  FROM public.org_entitlement_overrides o
  JOIN public.entitlements e ON e.id = o.entitlement_id
  WHERE o.org_id = org_uuid
  
  UNION ALL
  
  -- Then get plan entitlements (exclude overridden ones)
  SELECT 
    e.key,
    e.description,
    pe.value,
    e.value_type,
    false AS is_override
  FROM public.subscriptions s
  JOIN public.plan_entitlements pe ON pe.plan_id = s.plan_id
  JOIN public.entitlements e ON e.id = pe.entitlement_id
  WHERE s.org_id = org_uuid
  AND NOT EXISTS (
    SELECT 1 FROM public.org_entitlement_overrides o
    WHERE o.org_id = org_uuid AND o.entitlement_id = e.id
  );
END;
$$;

COMMENT ON FUNCTION public.get_org_entitlements IS 'Get all entitlements for an organization including overrides';

-- Function: Check specific entitlement for an organization
CREATE OR REPLACE FUNCTION public.check_entitlement(
  org_uuid UUID,
  entitlement_key TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  entitlement_value TEXT;
BEGIN
  -- First check for override
  SELECT o.value INTO entitlement_value
  FROM public.org_entitlement_overrides o
  JOIN public.entitlements e ON e.id = o.entitlement_id
  WHERE o.org_id = org_uuid AND e.key = entitlement_key;
  
  IF entitlement_value IS NOT NULL THEN
    RETURN entitlement_value;
  END IF;
  
  -- If no override, get from plan
  SELECT pe.value INTO entitlement_value
  FROM public.subscriptions s
  JOIN public.plan_entitlements pe ON pe.plan_id = s.plan_id
  JOIN public.entitlements e ON e.id = pe.entitlement_id
  WHERE s.org_id = org_uuid AND e.key = entitlement_key;
  
  RETURN entitlement_value;
END;
$$;

COMMENT ON FUNCTION public.check_entitlement IS 'Get value of a specific entitlement for an organization';

-- Function: Check if organization can create a resource based on limits
CREATE OR REPLACE FUNCTION public.can_create_resource(
  org_uuid UUID,
  resource_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  limit_value TEXT;
  current_count INTEGER;
  limit_int INTEGER;
BEGIN
  -- Determine entitlement key based on resource type
  CASE resource_type
    WHEN 'environment' THEN
      limit_value := public.check_entitlement(org_uuid, 'environments_limit');
      SELECT COUNT(*) INTO current_count
      FROM public.environments
      WHERE organization_id = org_uuid;
    
    WHEN 'zone' THEN
      limit_value := public.check_entitlement(org_uuid, 'zones_limit');
      SELECT COUNT(*) INTO current_count
      FROM public.zones z
      JOIN public.environments e ON e.id = z.environment_id
      WHERE e.organization_id = org_uuid;
    
    WHEN 'member' THEN
      limit_value := public.check_entitlement(org_uuid, 'team_members_limit');
      SELECT COUNT(*) INTO current_count
      FROM public.organization_members
      WHERE organization_id = org_uuid;
    
    ELSE
      RETURN false;
  END CASE;
  
  -- If no limit defined, deny
  IF limit_value IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if unlimited (-1)
  limit_int := limit_value::INTEGER;
  IF limit_int = -1 THEN
    RETURN true;
  END IF;
  
  -- Check if under limit
  RETURN current_count < limit_int;
  
EXCEPTION
  WHEN OTHERS THEN
    -- If conversion fails or other error, deny
    RETURN false;
END;
$$;

COMMENT ON FUNCTION public.can_create_resource IS 'Check if organization can create a resource based on subscription limits';

