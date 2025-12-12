-- Migration: Sync contact form tables with production
-- Disable RLS on irongrove_contact_submissions and add documentation

-- Disable RLS on irongrove_contact_submissions to match production
ALTER TABLE public.irongrove_contact_submissions DISABLE ROW LEVEL SECURITY;

-- Add table comments
COMMENT ON TABLE public.irongrove_contact_submissions IS 'Contact form submissions from the Irongrove website';

COMMENT ON TABLE public."marketing-website-contact-form" IS 'Public contact form submissions with anti-spam protection. Direct anon writes disabled - use API route.';

COMMENT ON COLUMN public."marketing-website-contact-form".inquiry_type IS 'Type of inquiry: general, founders-pricing, enterprise, support, partnership';



