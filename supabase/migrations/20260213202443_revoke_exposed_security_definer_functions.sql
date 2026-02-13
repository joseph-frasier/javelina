-- ================================================================
-- Migration: Revoke EXECUTE on exposed SECURITY DEFINER functions
-- ================================================================
-- These three SECURITY DEFINER functions have no internal authorization
-- checks and are only called from the backend via service_role.
-- Revoking EXECUTE from authenticated/anon prevents:
--   - get_org_subscription: info disclosure of billing data for ANY org
--   - check_rate_limit: manipulation of rate limit counters
--   - verify_api_token: token metadata leakage to anon users
-- ================================================================

-- 1. get_org_subscription(org_uuid uuid)
--    Reads subscription details (plan, status, billing periods, Stripe ID)
--    for any org. Only called from backend subscriptionsController.ts.
REVOKE EXECUTE ON FUNCTION public.get_org_subscription(uuid) FROM authenticated, anon;

-- 2. check_rate_limit(rate_identifier text, rate_endpoint text, rate_limit integer, window_ms bigint)
--    Manipulates rate_limits table (INSERT ON CONFLICT UPDATE, FOR UPDATE lock).
--    Only called from backend middleware.
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, bigint) FROM authenticated, anon;

-- 3. verify_api_token(token_hash_param text)
--    Updates last_used_at and returns token metadata (token_id, user_id, org_id, scopes, expires_at).
--    Only called from backend auth middleware.
REVOKE EXECUTE ON FUNCTION public.verify_api_token(text) FROM authenticated, anon;
