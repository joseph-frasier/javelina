-- Migration: Add any missing indexes for performance
-- Ensures dev has same index coverage as production

-- Index on zones.deleted_at for soft delete queries
CREATE INDEX IF NOT EXISTS idx_zones_deleted_at 
ON public.zones(deleted_at) 
WHERE deleted_at IS NOT NULL;

-- Index on zones.live for filtering active zones
CREATE INDEX IF NOT EXISTS idx_zones_live 
ON public.zones(live) 
WHERE live = true;

-- Composite index for common zone queries
CREATE INDEX IF NOT EXISTS idx_zones_environment_live 
ON public.zones(environment_id, live) 
WHERE deleted_at IS NULL;

-- Index on subscriptions status for filtering
CREATE INDEX IF NOT EXISTS idx_subscriptions_status 
ON public.subscriptions(status);

-- Index on subscriptions org_id for lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_org_id 
ON public.subscriptions(org_id);



