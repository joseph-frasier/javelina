-- Migration: Sync contact form tables with production
-- Make this migration safe to replay from scratch by only touching tables if they exist.

DO $$
BEGIN
  -- =====================================================
  -- Handle public.irongrove_contact_submissions
  -- =====================================================
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name   = 'irongrove_contact_submissions'
  ) THEN
    -- Disable RLS on irongrove_contact_submissions to match production
    ALTER TABLE public.irongrove_contact_submissions
      DISABLE ROW LEVEL SECURITY;

    -- Add table comment
    COMMENT ON TABLE public.irongrove_contact_submissions
      IS 'Contact form submissions from the Irongrove website';
  ELSE
    RAISE NOTICE 'Table public.irongrove_contact_submissions does not exist; skipping contact submissions sync.';
  END IF;

  -- =====================================================
  -- Handle public."marketing-website-contact-form"
  -- =====================================================
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name   = 'marketing-website-contact-form'
  ) THEN
    COMMENT ON TABLE public."marketing-website-contact-form"
      IS 'Public contact form submissions with anti-spam protection. Direct anon writes disabled - use API route.';

    COMMENT ON COLUMN public."marketing-website-contact-form".inquiry_type
      IS 'Type of inquiry: general, founders-pricing, enterprise, support, partnership';
  ELSE
    RAISE NOTICE 'Table public."marketing-website-contact-form" does not exist; skipping marketing form comments.';
  END IF;
END $$;




