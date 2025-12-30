# Backend Changes Required: Audit Logging Migration

## Overview

The audit logging system has been updated to use PostgreSQL functions instead of direct database mutations. This ensures that `user_id` is properly captured in audit logs when using the service role key.

## What Changed

### Before (Incorrect)
```javascript
// Direct mutations - user_id was not captured
const { data, error } = await supabaseAdmin
  .from('zones')
  .insert({ name: 'example.com', organization_id: orgId });
```

### After (Correct)
```javascript
// Use PostgreSQL function - user_id is captured automatically
const { data, error } = await supabaseAdmin
  .rpc('create_zone_with_audit', {
    p_user_id: req.user.id,
    p_name: 'example.com',
    p_organization_id: orgId
  });
```

## Why This Change Was Necessary

1. **Service Role Key Problem**: The backend uses `supabaseAdmin` with a service role key, which bypasses RLS and has no user session
2. **`auth.uid()` Returns NULL**: Database triggers couldn't determine the authenticated user
3. **Solution**: PostgreSQL functions set a session variable before mutations, which the audit log trigger can read

## Migration Applied

**Migration File**: `20251230000003_audit_logging_functions.sql`
**Applied To**: Dev database (ipfsrbxjgewhdcvonrbo)

This migration created 9 PostgreSQL functions for audited mutations.

---

## Required Backend Changes

### 🔴 CRITICAL: All Direct Mutations Must Be Replaced

You MUST replace all direct Supabase mutations with the corresponding PostgreSQL functions for these tables:
- `zones`
- `zone_records`
- `organizations`

**DO NOT** use `.from()`, `.insert()`, `.update()`, or `.delete()` for these tables anymore.

---

## Available Functions

### Zones

| Function | Parameters | Returns |
|----------|-----------|---------|
| `create_zone_with_audit` | `p_user_id`, `p_name`, `p_organization_id`, `p_description`, `p_admin_email`, `p_negative_caching_ttl` | `zones` row |
| `update_zone_with_audit` | `p_user_id`, `p_zone_id`, `p_name`, `p_description`, `p_admin_email`, `p_negative_caching_ttl`, `p_live` | `zones` row |
| `delete_zone_with_audit` | `p_user_id`, `p_zone_id` | `zones` row (soft delete) |

### Zone Records (DNS Records)

| Function | Parameters | Returns |
|----------|-----------|---------|
| `create_zone_record_with_audit` | `p_user_id`, `p_zone_id`, `p_name`, `p_type`, `p_value`, `p_ttl`, `p_comment` | `zone_records` row |
| `update_zone_record_with_audit` | `p_user_id`, `p_record_id`, `p_name`, `p_type`, `p_value`, `p_ttl`, `p_comment` | `zone_records` row |
| `delete_zone_record_with_audit` | `p_user_id`, `p_record_id` | `zone_records` row |

### Organizations

| Function | Parameters | Returns |
|----------|-----------|---------|
| `create_organization_with_audit` | `p_user_id`, `p_name`, `p_description`, `p_slug`, `p_owner_id` | `organizations` row |
| `update_organization_with_audit` | `p_user_id`, `p_org_id`, `p_name`, `p_description`, `p_slug`, `p_logo_url`, `p_settings`, `p_is_active` | `organizations` row |
| `delete_organization_with_audit` | `p_user_id`, `p_org_id` | `organizations` row (soft delete) |

**Note**: All parameters except `p_user_id` and the ID field (e.g., `p_zone_id`, `p_record_id`) are optional for update functions. Only pass the fields you want to update.

---

## Implementation Guide

### 1. Zones Controller

#### Create Zone (`POST /api/zones`)

**Before:**
```javascript
const { data: zone, error } = await supabaseAdmin
  .from('zones')
  .insert({
    name: req.body.name,
    organization_id: req.body.organization_id,
    description: req.body.description,
    admin_email: req.body.admin_email || 'admin@example.com',
    negative_caching_ttl: req.body.negative_caching_ttl || 3600,
    created_by: req.user.id
  })
  .select()
  .single();
```

**After:**
```javascript
const { data: zone, error } = await supabaseAdmin
  .rpc('create_zone_with_audit', {
    p_user_id: req.user.id,
    p_name: req.body.name,
    p_organization_id: req.body.organization_id,
    p_description: req.body.description,
    p_admin_email: req.body.admin_email || 'admin@example.com',
    p_negative_caching_ttl: req.body.negative_caching_ttl || 3600
  });
```

#### Update Zone (`PUT /api/zones/:id`)

**Before:**
```javascript
const { data: zone, error } = await supabaseAdmin
  .from('zones')
  .update({
    name: req.body.name,
    description: req.body.description,
    admin_email: req.body.admin_email,
    negative_caching_ttl: req.body.negative_caching_ttl,
    live: req.body.live
  })
  .eq('id', req.params.id)
  .select()
  .single();
```

**After:**
```javascript
const { data: zone, error } = await supabaseAdmin
  .rpc('update_zone_with_audit', {
    p_user_id: req.user.id,
    p_zone_id: req.params.id,
    p_name: req.body.name,
    p_description: req.body.description,
    p_admin_email: req.body.admin_email,
    p_negative_caching_ttl: req.body.negative_caching_ttl,
    p_live: req.body.live
  });
```

#### Delete Zone (`DELETE /api/zones/:id`)

**Before:**
```javascript
const { data: zone, error } = await supabaseAdmin
  .from('zones')
  .update({ deleted_at: new Date().toISOString(), live: false })
  .eq('id', req.params.id)
  .select()
  .single();
```

**After:**
```javascript
const { data: zone, error } = await supabaseAdmin
  .rpc('delete_zone_with_audit', {
    p_user_id: req.user.id,
    p_zone_id: req.params.id
  });
```

---

### 2. DNS Records Controller

#### Create DNS Record (`POST /api/dns-records`)

**Before:**
```javascript
const { data: record, error } = await supabaseAdmin
  .from('zone_records')
  .insert({
    zone_id: req.body.zone_id,
    name: req.body.name,
    type: req.body.type,
    value: req.body.value,
    ttl: req.body.ttl || 3600,
    comment: req.body.comment,
    created_by: req.user.id
  })
  .select()
  .single();
```

**After:**
```javascript
const { data: record, error } = await supabaseAdmin
  .rpc('create_zone_record_with_audit', {
    p_user_id: req.user.id,
    p_zone_id: req.body.zone_id,
    p_name: req.body.name,
    p_type: req.body.type,
    p_value: req.body.value,
    p_ttl: req.body.ttl || 3600,
    p_comment: req.body.comment
  });
```

#### Update DNS Record (`PUT /api/dns-records/:id`)

**Before:**
```javascript
const { data: record, error } = await supabaseAdmin
  .from('zone_records')
  .update({
    name: req.body.name,
    type: req.body.type,
    value: req.body.value,
    ttl: req.body.ttl,
    comment: req.body.comment
  })
  .eq('id', req.params.id)
  .select()
  .single();
```

**After:**
```javascript
const { data: record, error } = await supabaseAdmin
  .rpc('update_zone_record_with_audit', {
    p_user_id: req.user.id,
    p_record_id: req.params.id,
    p_name: req.body.name,
    p_type: req.body.type,
    p_value: req.body.value,
    p_ttl: req.body.ttl,
    p_comment: req.body.comment
  });
```

#### Delete DNS Record (`DELETE /api/dns-records/:id`)

**Before:**
```javascript
const { data: record, error } = await supabaseAdmin
  .from('zone_records')
  .delete()
  .eq('id', req.params.id)
  .select()
  .single();
```

**After:**
```javascript
const { data: record, error } = await supabaseAdmin
  .rpc('delete_zone_record_with_audit', {
    p_user_id: req.user.id,
    p_record_id: req.params.id
  });
```

---

### 3. Organizations Controller

#### Create Organization (`POST /api/organizations`)

**Before:**
```javascript
const { data: org, error } = await supabaseAdmin
  .from('organizations')
  .insert({
    name: req.body.name,
    description: req.body.description,
    slug: req.body.slug,
    owner_id: req.user.id
  })
  .select()
  .single();
```

**After:**
```javascript
const { data: org, error } = await supabaseAdmin
  .rpc('create_organization_with_audit', {
    p_user_id: req.user.id,
    p_name: req.body.name,
    p_description: req.body.description,
    p_slug: req.body.slug,
    p_owner_id: req.user.id
  });
```

#### Update Organization (`PUT /api/organizations/:id`)

**Before:**
```javascript
const { data: org, error } = await supabaseAdmin
  .from('organizations')
  .update({
    name: req.body.name,
    description: req.body.description,
    slug: req.body.slug,
    logo_url: req.body.logo_url,
    settings: req.body.settings,
    is_active: req.body.is_active
  })
  .eq('id', req.params.id)
  .select()
  .single();
```

**After:**
```javascript
const { data: org, error } = await supabaseAdmin
  .rpc('update_organization_with_audit', {
    p_user_id: req.user.id,
    p_org_id: req.params.id,
    p_name: req.body.name,
    p_description: req.body.description,
    p_slug: req.body.slug,
    p_logo_url: req.body.logo_url,
    p_settings: req.body.settings,
    p_is_active: req.body.is_active
  });
```

#### Delete Organization (`DELETE /api/organizations/:id`)

**Before:**
```javascript
const { data: org, error } = await supabaseAdmin
  .from('organizations')
  .update({ deleted_at: new Date().toISOString(), status: 'deleted' })
  .eq('id', req.params.id)
  .select()
  .single();
```

**After:**
```javascript
const { data: org, error } = await supabaseAdmin
  .rpc('delete_organization_with_audit', {
    p_user_id: req.user.id,
    p_org_id: req.params.id
  });
```

---

## Error Handling

The RPC functions return the same data structure as before, so your existing error handling should work:

```javascript
const { data, error } = await supabaseAdmin
  .rpc('create_zone_with_audit', {
    p_user_id: req.user.id,
    p_name: name,
    p_organization_id: orgId
  });

if (error) {
  console.error('Failed to create zone:', error);
  throw new Error(`Failed to create zone: ${error.message}`);
}

// data contains the created zone
return data;
```

---

## Important Notes

### 1. Read Operations (SELECT) - No Changes Required

You can still use the query builder for read operations:

```javascript
// This is fine - reads don't need audit logging
const { data: zones } = await supabaseAdmin
  .from('zones')
  .select('*')
  .eq('organization_id', orgId);
```

### 2. Optional Parameters

For update functions, only pass the fields you want to update:

```javascript
// Update only the name
await supabaseAdmin.rpc('update_zone_with_audit', {
  p_user_id: req.user.id,
  p_zone_id: zoneId,
  p_name: 'new-name.com'
  // Other fields will remain unchanged
});
```

### 3. Return Values

All functions return the complete row (just like `.select().single()` did):

```javascript
const { data: zone } = await supabaseAdmin
  .rpc('create_zone_with_audit', { ... });

console.log(zone.id);           // UUID
console.log(zone.name);         // Zone name
console.log(zone.created_at);   // Timestamp
// ... all other zone fields
```

---

## Verification Steps

After implementing the changes:

### 1. Test Create Operation

Create a zone via the API:

```bash
curl -X POST http://localhost:YOUR_PORT/api/zones \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test.com",
    "organization_id": "YOUR_ORG_ID"
  }'
```

### 2. Check Audit Log

In Supabase SQL Editor:

```sql
SELECT 
  table_name,
  action,
  user_id,
  old_data,
  new_data,
  created_at
FROM audit_logs 
WHERE table_name = 'zones'
ORDER BY created_at DESC 
LIMIT 1;
```

**Expected Result:**
- ✅ `user_id` is NOT NULL (should be the authenticated user's UUID)
- ✅ `action` is 'INSERT'
- ✅ `old_data` is NULL (for insert)
- ✅ `new_data` contains the zone data

### 3. Test Update Operation

Update the zone:

```bash
curl -X PUT http://localhost:YOUR_PORT/api/zones/ZONE_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "updated.com"
  }'
```

Check the audit log again:

```sql
SELECT 
  table_name,
  action,
  user_id,
  old_data->>'name' as old_name,
  new_data->>'name' as new_name
FROM audit_logs 
WHERE table_name = 'zones' 
AND action = 'UPDATE'
ORDER BY created_at DESC 
LIMIT 1;
```

**Expected Result:**
- ✅ `user_id` is NOT NULL
- ✅ `action` is 'UPDATE'
- ✅ `old_data` contains the original zone data
- ✅ `new_data` contains the updated zone data
- ✅ You can see the name change from 'test.com' to 'updated.com'

---

## Checklist

Use this checklist to track your implementation:

### Zones Controller
- [ ] `POST /api/zones` - Create zone
- [ ] `PUT /api/zones/:id` - Update zone
- [ ] `DELETE /api/zones/:id` - Delete zone (soft delete)

### DNS Records Controller
- [ ] `POST /api/dns-records` - Create DNS record
- [ ] `PUT /api/dns-records/:id` - Update DNS record
- [ ] `DELETE /api/dns-records/:id` - Delete DNS record

### Organizations Controller
- [ ] `POST /api/organizations` - Create organization
- [ ] `PUT /api/organizations/:id` - Update organization
- [ ] `DELETE /api/organizations/:id` - Delete organization (soft delete)

### Verification
- [ ] Create operations log with `user_id`
- [ ] Update operations capture `old_data` and `new_data`
- [ ] Delete operations log with `user_id`
- [ ] Audit logs display correctly in frontend

---

## Need Help?

If you encounter any issues:

1. **Check the migration file**: `supabase/migrations/20251230000003_audit_logging_functions.sql`
2. **Review the main documentation**: `EXPRESS_API_CHANGES_REQUIRED.md` (Section 12)
3. **Verify function exists**: Run `\df *_with_audit` in Supabase SQL Editor
4. **Check error messages**: Look for PostgreSQL errors in backend logs

---

## Summary

**Bottom Line**: Replace all `.from('zones')`, `.from('zone_records')`, and `.from('organizations')` mutations with the corresponding `*_with_audit` RPC functions. This ensures audit logs capture the `user_id` correctly.

**Time Estimate**: 2-3 hours for all controllers + testing
**Priority**: High - Audit logging is currently broken for backend operations
**Risk**: Low - Functions have the same interface and return values as before

