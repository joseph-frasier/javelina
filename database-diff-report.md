# Database Schema Diff Report
**Production (`uhkwiqupiekatbtxxaky`) vs Dev (`ipfsrbxjgewhdcvonrbo`)**

Generated: 2025-11-24

---

## Table Existence Comparison

### Tables in BOTH databases ✅
- auth.users
- auth.refresh_tokens
- auth.instances
- auth.audit_log_entries
- auth.schema_migrations
- auth.identities
- auth.sessions
- auth.mfa_factors
- auth.mfa_challenges
- auth.mfa_amr_claims
- auth.sso_providers
- auth.sso_domains
- auth.saml_providers
- auth.saml_relay_states
- auth.flow_state
- auth.one_time_tokens
- auth.oauth_clients
- auth.oauth_authorizations
- auth.oauth_consents
- public.profiles
- public.organizations
- public.organization_members
- public.environments
- public.zones
- public.audit_logs
- public.zone_records
- public.plans
- public.entitlements
- public.plan_entitlements
- public.subscriptions
- public.subscription_items
- public.org_entitlement_overrides
- public.irongrove_contact_submissions
- public.marketing-website-contact-form

### Tables ONLY in Production ❌
*None - all tables exist in both*

### Tables ONLY in Dev ❌
*None - all tables exist in both*

---

## Schema Differences by Table

### 🔴 public.organizations
**Column order differences:**
- Production order: id, name, description, created_at, updated_at, slug, logo_url, settings, is_active, owner_id, status, deleted_at, stripe_customer_id, environments_count
- Dev order: id, name, description, created_at, updated_at, stripe_customer_id, environments_count, deleted_at, slug, logo_url, settings, is_active, owner_id, status

**Analysis:** Same columns, different order (not a functional issue)

---

### 🔴 public.environments
**Column order differences:**
- Production: id, organization_id, name, environment_type, location, status, description, created_at, updated_at, created_by, configuration, metadata, parent_environment_id, last_deployed_at, health_status, zones_count
- Dev: id, organization_id, name, environment_type, location, status, description, created_at, updated_at, created_by, zones_count, configuration, metadata, parent_environment_id, last_deployed_at, health_status

**Analysis:** Same columns, different order (not a functional issue)

---

### 🔴 public.zones
**MAJOR DIFFERENCES:**

**Production has these columns:**
- id, environment_id, name, description, created_at, updated_at, created_by, nameservers, last_verified_at, verification_status, soa_serial, **live**, deleted_at, admin_email, negative_caching_ttl, **error**

**Dev has these columns:**
- id, environment_id, name, description, created_at, updated_at, created_by, soa_serial, nameservers, last_verified_at, verification_status, admin_email, negative_caching_ttl, **error**

**Missing in Dev:**
- `deleted_at` column (timestamp with time zone)
- `live` column (boolean, default true)

**Analysis:** Dev is missing 2 columns that exist in production

---

### 🔴 public.subscriptions
**Status check constraint difference:**

**Production allowed statuses:**
```
'incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due', 
'canceled', 'unpaid', 'paused', 'lifetime'
```

**Dev allowed statuses:**
```
'trialing', 'active', 'past_due', 'unpaid', 'canceled', 'incomplete', 
'incomplete_expired', 'paused'
```

**Missing in Dev:** `'lifetime'` status

**Analysis:** Dev cannot support lifetime subscriptions

---

### 🔴 public.plans
**billing_interval constraint difference:**

**Production:**
```sql
billing_interval IS NULL OR (billing_interval = ANY (ARRAY['month'::text, 'year'::text]))
```

**Dev:**
```sql
billing_interval = ANY (ARRAY['month'::text, 'year'::text])
```

**Analysis:** Production allows NULL billing_interval, Dev does not

---

### 🔴 public.marketing-website-contact-form
**Comment difference:**

**Production:**
```
"Public contact form submissions with anti-spam protection. Direct anon writes disabled - use API route."
```

**Dev:**
*No comment*

**inquiry_type comment:**

**Production:**
```
"Type of inquiry: general, founders-pricing, enterprise, support, partnership"
```

**Dev:**
*No comment*

**Analysis:** Documentation missing in dev

---

### 🔴 public.irongrove_contact_submissions
**RLS Status:**

**Production:** RLS disabled (`rls_enabled: false`)
**Dev:** RLS enabled (`rls_enabled: true`)

**Comment:**

**Production:**
```
"Contact form submissions from the Irongrove website"
```

**Dev:**
*No comment*

**Analysis:** Security policy difference - dev has RLS enabled

---

### 🔴 public.marketing-website-contact-form (id column)
**Identity generation:**

**Production:** id is `bigint` with **identity generation**
**Dev:** id is `bigint` (but details unclear from output)

**Analysis:** May have different auto-increment behavior

---

## Data Volume Comparison

| Table | Production Rows | Dev Rows | Difference |
|-------|----------------|----------|------------|
| auth.users | 42 | 1 | -41 (98% less) |
| auth.refresh_tokens | 45 | 2 | -43 (96% less) |
| auth.audit_log_entries | 1,718 | 6 | -1,712 (99% less) |
| auth.identities | 45 | 1 | -44 (98% less) |
| auth.sessions | 13 | 1 | -12 (92% less) |
| auth.mfa_amr_claims | 13 | 1 | -12 (92% less) |
| auth.flow_state | 97 | 0 | -97 (100% less) |
| auth.one_time_tokens | 9 | 0 | -9 (100% less) |
| public.profiles | 42 | 1 | -41 (98% less) |
| public.organizations | 103 | 1 | -102 (99% less) |
| public.organization_members | 441 | 1 | -440 (99% less) |
| public.environments | 36 | 0 | -36 (100% less) |
| public.zones | 61 | 0 | -61 (100% less) |
| public.audit_logs | 949 | 2 | -947 (99% less) |
| public.zone_records | 20 | 0 | -20 (100% less) |
| public.subscriptions | 55 | 0 | -55 (100% less) |
| public.subscription_items | 73 | 0 | -73 (100% less) |
| public.marketing-website-contact-form | 14 | 0 | -14 (100% less) |
| public.irongrove_contact_submissions | 4 | 0 | -4 (100% less) |

**Dev is essentially empty** - appears to be a fresh/test environment

---

## Summary of Critical Issues

### 🚨 HIGH PRIORITY (Schema Breaking)
1. **zones.deleted_at** - Missing in dev (affects soft delete functionality)
2. **zones.live** - Missing in dev (affects zone activation logic)
3. **subscriptions status** - Missing 'lifetime' option in dev
4. **plans.billing_interval** - Dev doesn't allow NULL (may break free plans)

### ⚠️ MEDIUM PRIORITY (Functional)
5. **irongrove_contact_submissions RLS** - Enabled in dev, disabled in prod (security mismatch)
6. **Table comments** - Missing documentation in dev

### ℹ️ LOW PRIORITY (Cosmetic)
7. **Column ordering** - Different between databases (doesn't affect functionality)
8. **Data volume** - Dev is empty (expected for test environment)

---

## Recommended Actions

### Option 1: Reset Dev to Match Production Schema
```bash
# Use Supabase CLI to reset branch and apply production schema
```

### Option 2: Create Migration to Fix Dev
Create migrations for:
1. Add `deleted_at` to zones
2. Add `live` to zones  
3. Update subscriptions check constraint to include 'lifetime'
4. Update plans.billing_interval constraint to allow NULL
5. Disable RLS on irongrove_contact_submissions
6. Add missing table/column comments

### Option 3: Rebase Dev Branch
Use Supabase branch rebase to sync with production migrations.

---

## Notes
- Dev branch currently shows status: `MIGRATIONS_FAILED`
- Migration history shows dev is behind by 3 migrations
- However, some schema elements (like zones.error) exist in dev despite missing migrations
- This suggests manual schema changes or partial migration application



