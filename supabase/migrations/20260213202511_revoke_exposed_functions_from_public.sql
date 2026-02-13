-- ================================================================
-- Migration: Complete the EXECUTE revocation from PUBLIC
-- ================================================================
-- The previous migration revoked from authenticated/anon but the
-- functions still inherited EXECUTE via the PUBLIC default grant.
-- This migration revokes from PUBLIC and explicitly re-grants to
-- service_role only. Idempotent (REVOKE IF EXISTS is implicit).
-- ================================================================

-- Revoke the default PUBLIC grant
REVOKE EXECUTE ON FUNCTION public.get_org_subscription(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, bigint) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.verify_api_token(text) FROM PUBLIC;

-- Revoke from authenticated/anon explicitly (belt and suspenders)
REVOKE EXECUTE ON FUNCTION public.get_org_subscription(uuid) FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, bigint) FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.verify_api_token(text) FROM authenticated, anon;

-- Explicitly grant only to service_role
GRANT EXECUTE ON FUNCTION public.get_org_subscription(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_api_token(text) TO service_role;
