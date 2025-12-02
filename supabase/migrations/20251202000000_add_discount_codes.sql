-- Add Discount Codes / Promotion Codes Support
-- Uses Stripe's native promotion codes, synced to Supabase for admin UI and audit
-- Migration created: 2025-12-02

-- =====================================================
-- 1. PROMOTION_CODES TABLE (synced from Stripe)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.promotion_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_promotion_code_id TEXT UNIQUE NOT NULL,
  stripe_coupon_id TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent_off', 'amount_off')),
  discount_value NUMERIC NOT NULL,
  currency TEXT DEFAULT 'usd',
  max_redemptions INTEGER,
  times_redeemed INTEGER DEFAULT 0,
  first_time_transaction_only BOOLEAN DEFAULT true,
  applies_to_plans TEXT[], -- NULL means all plans, otherwise array of plan codes
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.promotion_codes ENABLE ROW LEVEL SECURITY;

-- RLS: Only superusers can view/manage promotion codes
-- Note: Uses superadmin boolean column, not role text column
CREATE POLICY "Superusers can view promotion codes"
  ON public.promotion_codes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.superadmin = true
    )
  );

CREATE POLICY "Superusers can manage promotion codes"
  ON public.promotion_codes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.superadmin = true
    )
  );

-- Service role can manage all (for backend webhooks)
CREATE POLICY "Service role can manage promotion codes"
  ON public.promotion_codes FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_promotion_codes_code ON public.promotion_codes(code);
CREATE INDEX IF NOT EXISTS idx_promotion_codes_stripe_id ON public.promotion_codes(stripe_promotion_code_id);
CREATE INDEX IF NOT EXISTS idx_promotion_codes_is_active ON public.promotion_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_promotion_codes_expires_at ON public.promotion_codes(expires_at);

COMMENT ON TABLE public.promotion_codes IS 'Promotion codes synced from Stripe for admin UI and audit';
COMMENT ON COLUMN public.promotion_codes.stripe_promotion_code_id IS 'Stripe Promotion Code ID';
COMMENT ON COLUMN public.promotion_codes.stripe_coupon_id IS 'Stripe Coupon ID that this promotion code references';
COMMENT ON COLUMN public.promotion_codes.code IS 'The customer-facing code (e.g., SAVE20)';
COMMENT ON COLUMN public.promotion_codes.discount_type IS 'Type of discount: percent_off or amount_off';
COMMENT ON COLUMN public.promotion_codes.discount_value IS 'Value of discount (percentage or cents amount)';
COMMENT ON COLUMN public.promotion_codes.first_time_transaction_only IS 'Whether code only applies to first-time purchases';
COMMENT ON COLUMN public.promotion_codes.applies_to_plans IS 'NULL means all plans, otherwise array of plan codes';

-- =====================================================
-- 2. DISCOUNT_REDEMPTIONS TABLE (usage tracking)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.discount_redemptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  promotion_code_id UUID REFERENCES public.promotion_codes(id) ON DELETE SET NULL,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  stripe_invoice_id TEXT,
  amount_discounted NUMERIC NOT NULL,
  original_amount NUMERIC NOT NULL,
  final_amount NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.discount_redemptions ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view their own organization's redemptions
CREATE POLICY "Users can view their org redemptions"
  ON public.discount_redemptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = discount_redemptions.org_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- Superusers can view all redemptions
-- Note: Uses superadmin boolean column, not role text column
CREATE POLICY "Superusers can view all redemptions"
  ON public.discount_redemptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.superadmin = true
    )
  );

-- Service role can manage all (for backend)
CREATE POLICY "Service role can manage redemptions"
  ON public.discount_redemptions FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_discount_redemptions_org_id ON public.discount_redemptions(org_id);
CREATE INDEX IF NOT EXISTS idx_discount_redemptions_promotion_code_id ON public.discount_redemptions(promotion_code_id);
CREATE INDEX IF NOT EXISTS idx_discount_redemptions_created_at ON public.discount_redemptions(created_at);

COMMENT ON TABLE public.discount_redemptions IS 'Tracks when promotion codes are redeemed';
COMMENT ON COLUMN public.discount_redemptions.amount_discounted IS 'Amount saved by the discount';
COMMENT ON COLUMN public.discount_redemptions.original_amount IS 'Original price before discount';
COMMENT ON COLUMN public.discount_redemptions.final_amount IS 'Final price after discount';

-- =====================================================
-- 3. UPDATE TIMESTAMP TRIGGERS
-- =====================================================

-- Trigger for promotion_codes
DROP TRIGGER IF EXISTS promotion_codes_updated_at ON public.promotion_codes;
CREATE TRIGGER promotion_codes_updated_at
  BEFORE UPDATE ON public.promotion_codes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- 4. HELPER FUNCTIONS
-- =====================================================

-- Function: Increment redemption count
CREATE OR REPLACE FUNCTION public.increment_promotion_code_redemption(promo_code_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.promotion_codes
  SET times_redeemed = times_redeemed + 1,
      updated_at = now()
  WHERE id = promo_code_id;
END;
$$;

-- Function: Check if promotion code is valid
CREATE OR REPLACE FUNCTION public.is_promotion_code_valid(promo_code TEXT)
RETURNS TABLE (
  is_valid BOOLEAN,
  promotion_code_id UUID,
  discount_type TEXT,
  discount_value NUMERIC,
  reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  promo_record RECORD;
BEGIN
  -- Look up the promotion code
  SELECT * INTO promo_record
  FROM public.promotion_codes pc
  WHERE UPPER(pc.code) = UPPER(promo_code);
  
  -- Code not found
  IF promo_record IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::NUMERIC, 'Invalid promotion code'::TEXT;
    RETURN;
  END IF;
  
  -- Code is not active
  IF NOT promo_record.is_active THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::NUMERIC, 'This promotion code is no longer active'::TEXT;
    RETURN;
  END IF;
  
  -- Code has expired
  IF promo_record.expires_at IS NOT NULL AND promo_record.expires_at < now() THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::NUMERIC, 'This promotion code has expired'::TEXT;
    RETURN;
  END IF;
  
  -- Code has reached max redemptions
  IF promo_record.max_redemptions IS NOT NULL AND promo_record.times_redeemed >= promo_record.max_redemptions THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::NUMERIC, 'This promotion code has reached its usage limit'::TEXT;
    RETURN;
  END IF;
  
  -- Code is valid
  RETURN QUERY SELECT 
    true, 
    promo_record.id, 
    promo_record.discount_type, 
    promo_record.discount_value,
    'Valid promotion code'::TEXT;
END;
$$;

COMMENT ON FUNCTION public.is_promotion_code_valid IS 'Validates a promotion code and returns discount details';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Verify tables were created
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE columns.table_name = tables.table_name) as column_count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('promotion_codes', 'discount_redemptions')
ORDER BY table_name;

