<!-- f6852d6a-5a6f-4863-9a94-4f0791a4912b 0944a3ff-4246-40ee-adf1-f14793c77b96 -->
# Remove Entitlements System for Launch Darkly

## Important Notes

**All database changes will be applied to the DEV database through migration files only. No direct SQL execution. All migrations will be stored in `supabase/migrations/` directory.**

**Backend Express API changes will need to be handled separately in a different workspace.**

## Database Changes (Via Migration)

### Create Migration File

File: `supabase/migrations/[timestamp]_remove_entitlements_system.sql`

### Tables to Drop

- `entitlements` - stores available entitlement types
- `plan_entitlements` - maps entitlements to plans
- `org_entitlement_overrides` - custom entitlements for specific orgs

### Database Functions to Drop

- `get_org_entitlements()` - retrieves all entitlements for an org
- `check_entitlement()` - checks specific entitlement value
- `can_create_resource()` - checks if org can create resources

The migration will drop functions with CASCADE, then drop tables with CASCADE. Keep `plans` and `subscriptions` tables intact.

## Backend Express API Changes (To Be Done Separately)

**These endpoints need to be modified in the separate Express API codebase:**

- `/api/subscriptions/current` - remove entitlements from response
- `/api/subscriptions/can-create` - remove or stub to always return `can_create: true`

## Frontend Code Changes (This Workspace)

### Delete These Files

- `lib/entitlements.ts` - server-side entitlement helpers
- `lib/hooks/useEntitlements.ts` - React hook for entitlements

### Update API Client

- `lib/api-client.ts` - update `subscriptionsApi.getCurrent()` to not expect entitlements
- Remove or stub `subscriptionsApi.canCreate()` calls

### Update Components

- `components/billing/SubscriptionManager.tsx` - remove entitlement display
- `components/billing/UsageMeter.tsx` - check if it needs updates
- `app/organization/[orgId]/OrganizationClient.tsx` - remove entitlement checks
- `app/organization/[orgId]/environment/[envId]/EnvironmentClient.tsx` - remove checks
- `app/settings/billing/[org_id]/page.tsx` - simplify billing display
- `app/test-api/page.tsx` - remove entitlement test code

### Update Type Definitions

- `types/billing.ts` - remove entitlement-related types:
- `Entitlement`
- `PlanEntitlement`
- `OrgEntitlementOverride`
- `OrgEntitlement`
- `EntitlementCheckResponse`
- `CanCreateResourceResponse`
- `EntitlementKey`

Keep: `Plan`, `Subscription`, `SubscriptionItem`, `OrgUsage`, `CurrentSubscriptionResponse`

## Verification

### Flows That Must Continue Working

1. Organization creation (already doesn't check entitlements)
2. Checkout flow and subscription creation
3. Environment and zone creation (remove limit checks, allow unlimited)
4. Billing page display

### Manual Testing After Changes

- Create a new organization
- Select a plan and complete checkout
- Create environments without limit errors
- Create zones without limit errors
- View billing page without crashes

### To-dos

- [ ] Create migration to drop entitlement tables and functions
- [ ] Update backend API to remove entitlement endpoints
- [ ] Delete entitlement-related lib files
- [ ] Remove entitlement checks from components
- [ ] Clean up type definitions
- [ ] Test org creation flow
- [ ] Test checkout and subscription flow