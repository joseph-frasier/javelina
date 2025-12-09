-- =====================================================
-- Zone Records Schema Updates
-- 1. Add PTR record type support
-- 2. Remove nameservers column from zones table
-- =====================================================

-- =====================================================
-- 1. Add PTR Record Type to zone_records
-- =====================================================

-- Drop existing constraint
ALTER TABLE public.zone_records
  DROP CONSTRAINT IF EXISTS dns_records_type_check;

-- Add new constraint with PTR included
ALTER TABLE public.zone_records
  ADD CONSTRAINT dns_records_type_check 
  CHECK (type = ANY (ARRAY['A'::text, 'AAAA'::text, 'CNAME'::text, 'MX'::text, 'NS'::text, 'TXT'::text, 'SOA'::text, 'SRV'::text, 'CAA'::text, 'PTR'::text]));

-- =====================================================
-- 2. Remove nameservers Column from zones Table
-- =====================================================

-- Root NS records are system-managed via zone_records table
-- The nameservers column is no longer needed for user-managed data
ALTER TABLE public.zones
  DROP COLUMN IF EXISTS nameservers;

-- =====================================================
-- Migration Notes
-- =====================================================
-- - PTR records are now supported for reverse DNS lookups
-- - Root NS records should be managed by the DNS service backend
-- - Users cannot create or edit NS records at the zone root
-- - NS records for subdomains are still allowed

