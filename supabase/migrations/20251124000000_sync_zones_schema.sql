-- Migration: Sync zones table schema with production
-- Adds missing columns: deleted_at and live

-- Add deleted_at column for soft delete functionality
ALTER TABLE public.zones
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

-- Add live column for zone activation logic
ALTER TABLE public.zones
ADD COLUMN IF NOT EXISTS live boolean DEFAULT true;

-- Update comment for zones table
COMMENT ON TABLE public.zones IS 'DNS zones with soft delete and activation support';

-- Add column comments
COMMENT ON COLUMN public.zones.deleted_at IS 'Timestamp when zone was soft deleted';
COMMENT ON COLUMN public.zones.live IS 'Whether zone is active/live';

