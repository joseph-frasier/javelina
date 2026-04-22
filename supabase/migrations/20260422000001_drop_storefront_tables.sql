-- Drop the standalone storefront tables.
-- business_starter and business_pro have been migrated to the plans table
-- via 20260422000000_add_business_plans.sql.
-- NOTE for Seth: apply this migration on dev and qa branches only. The main
-- branch never received the storefront tables, so applying there will no-op
-- (the IF EXISTS guards make it safe either way).
DROP TABLE IF EXISTS public.storefront_subscriptions;
DROP TABLE IF EXISTS public.storefront_products;
