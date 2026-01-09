-- ============================================================================
-- MAKE USER SUPERADMIN
-- ============================================================================
-- This script sets the superadmin flag for a specific user
-- Run this directly in Supabase SQL Editor or psql
-- ============================================================================

-- First, verify the user exists and check current status
SELECT 
    p.id,
    p.email,
    p.name,
    p.superadmin,
    p.role
FROM public.profiles p
WHERE p.email = 'testchesky301@outlook.com';

-- Set the user as superadmin
UPDATE public.profiles
SET 
    superadmin = true,
    role = 'superuser',
    updated_at = NOW()
WHERE email = 'testchesky301@outlook.com';

-- Verify the update
SELECT 
    p.id,
    p.email,
    p.name,
    p.superadmin,
    p.role,
    p.updated_at
FROM public.profiles p
WHERE p.email = 'testchesky301@outlook.com';

