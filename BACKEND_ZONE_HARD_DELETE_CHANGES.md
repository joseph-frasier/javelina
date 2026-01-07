# Backend Zone Hard Delete Changes

## Overview
This document outlines the required changes to the Express API backend to support the migration from soft deletion to hard deletion for zones. The frontend has been updated to require exact zone name confirmation before deletion, and the database has been migrated to remove the `deleted_at` column from the zones table.

**Important**: The `live` column is retained in the zones table as it serves purposes beyond soft deletion.

## Database Changes Applied (Frontend Repo)

The following migration has been created: `20260107000000_remove_zone_soft_delete.sql`

### Changes:
1. **Dropped Functions**:
   - `soft_delete_zone(uuid)` - No longer needed
   - `restore_zone(uuid)` - No longer needed
   - `delete_zone_with_audit(uuid, uuid)` - No longer needed

2. **Updated Functions**:
   - `check_zone_name_exists(zone_name text)` - Removed `deleted_at IS NULL` filter

3. **Schema Changes**:
   - **REMOVED**: `zones.deleted_at` column
   - **RETAINED**: `zones.live` column (has other uses)

4. **Cascade Deletes** (Already Configured):
   - `zone_records.zone_id` → `zones.id` (CASCADE DELETE)
   - `zone_tags.zone_id` → `zones.id` (CASCADE DELETE)

## Required Backend API Changes

### 1. Zone Deletion Endpoint

**Endpoint**: `DELETE /api/zones/:id`

**Current Implementation** (Soft Delete):
```javascript
// OLD: Soft delete implementation
app.delete('/api/zones/:id', async (req, res) => {
  const { id } = req.params;
  
  // Update deleted_at timestamp
  const { data, error } = await supabase
    .from('zones')
    .update({ 
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString() 
    })
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  
  return res.json({ data });
});
```

**New Implementation** (Hard Delete):
```javascript
// NEW: Hard delete implementation
app.delete('/api/zones/:id', async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id; // From auth middleware
  
  try {
    // Get zone data before deletion for audit logging
    const { data: zone, error: fetchError } = await supabase
      .from('zones')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError || !zone) {
      return res.status(404).json({ error: 'Zone not found' });
    }
    
    // Create audit log BEFORE deletion
    await supabase
      .from('audit_logs')
      .insert({
        table_name: 'zones',
        record_id: id,
        action: 'DELETE',
        old_data: zone,
        new_data: null,
        user_id: userId,
        metadata: {
          deleted_at: new Date().toISOString(),
          permanent: true,
          zone_name: zone.name
        }
      });
    
    // Perform hard delete (cascade deletes zone_records and zone_tags)
    const { error: deleteError } = await supabase
      .from('zones')
      .delete()
      .eq('id', id);
    
    if (deleteError) {
      return res.status(500).json({ error: deleteError.message });
    }
    
    // Return 204 No Content on successful deletion
    return res.status(204).send();
  } catch (error) {
    console.error('Error deleting zone:', error);
    return res.status(500).json({ error: 'Failed to delete zone' });
  }
});
```

**Key Changes**:
- Changed from `UPDATE` to `DELETE` query
- Fetch zone data BEFORE deletion for audit logging
- Create audit log BEFORE deletion (can't do it after)
- Return `204 No Content` on success instead of returning deleted data
- Cascade deletion automatically removes `zone_records` and `zone_tags`
- Mark audit log with `permanent: true` to distinguish from old soft deletes

### 2. Zone Query Endpoints

**Affected Endpoints**:
- `GET /api/zones`
- `GET /api/zones/organization/:orgId`
- `GET /api/zones/:id`
- Any other zone listing/search endpoints

**Required Changes**:
Remove all `.is('deleted_at', null)` filters from zone queries.

**Example - Before**:
```javascript
// OLD: Filter out soft-deleted zones
const { data, error } = await supabase
  .from('zones')
  .select('*')
  .eq('organization_id', orgId)
  .is('deleted_at', null)  // ❌ REMOVE THIS
  .order('created_at', { ascending: false });
```

**Example - After**:
```javascript
// NEW: No soft delete filtering needed
const { data, error } = await supabase
  .from('zones')
  .select('*')
  .eq('organization_id', orgId)
  .order('created_at', { ascending: false });
```

**Important**: Keep any filters on the `live` column - it serves other purposes:
```javascript
// ✅ KEEP filters on 'live' column
const { data, error } = await supabase
  .from('zones')
  .select('*')
  .eq('live', true)  // Keep this if filtering for active zones
  .order('created_at', { ascending: false });
```

### 3. Zone Name Uniqueness Validation

**Affected Endpoints**:
- `POST /api/zones` (create)
- `PUT /api/zones/:id` (update/rename)

**Current Implementation**:
```javascript
// OLD: Check uniqueness excluding soft-deleted zones
const { data: existing } = await supabase
  .from('zones')
  .select('id')
  .eq('name', zoneName)
  .is('deleted_at', null)  // ❌ REMOVE THIS
  .single();
```

**New Implementation**:
```javascript
// NEW: Check uniqueness globally (zone names immediately available after deletion)
const { data: existing } = await supabase
  .from('zones')
  .select('id')
  .eq('name', zoneName)
  .single();

if (existing) {
  return res.status(400).json({ 
    error: `A zone with the name "${zoneName}" already exists` 
  });
}
```

**Key Changes**:
- Zone names are now globally unique across all zones
- After deletion, zone name becomes immediately available for reuse
- No need to filter by `deleted_at` since the column no longer exists

### 4. Admin Zone Management Endpoints

**Affected Endpoints**:
- `DELETE /api/admin/zones/:id/restore` - **REMOVE THIS ENDPOINT**
- `GET /api/admin/zones/deleted` - **REMOVE THIS ENDPOINT**
- `GET /api/admin/zones/flagged` - **UPDATE THIS ENDPOINT**

**Zone Restore Endpoint** (Remove):
```javascript
// ❌ DELETE THIS ENTIRE ENDPOINT - Restoration no longer possible
app.post('/api/admin/zones/:id/restore', async (req, res) => {
  // ... remove this endpoint entirely
});
```

**Deleted Zones Listing** (Remove):
```javascript
// ❌ DELETE THIS ENTIRE ENDPOINT - No soft-deleted zones to list
app.get('/api/admin/zones/deleted', async (req, res) => {
  // ... remove this endpoint entirely
});
```

**Flagged Zones Listing** (Update):
```javascript
// BEFORE:
app.get('/api/admin/zones/flagged', async (req, res) => {
  const { data, error } = await supabase
    .from('zones')
    .select('*, organizations!inner(id, name)')
    .eq('live', false)
    .is('deleted_at', null)  // ❌ REMOVE THIS
    .order('created_at', { ascending: false });
  
  return res.json({ data });
});

// AFTER:
app.get('/api/admin/zones/flagged', async (req, res) => {
  const { data, error } = await supabase
    .from('zones')
    .select('*, organizations!inner(id, name)')
    .eq('live', false)  // ✅ Keep this - live=false still means "flagged"
    .order('created_at', { ascending: false });
  
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  
  return res.json({ data });
});
```

### 5. Audit Logging Updates

**Current Soft Delete Audit Logs**:
```javascript
// OLD: Audit log for soft delete
await supabase.from('audit_logs').insert({
  table_name: 'zones',
  record_id: zoneId,
  action: 'UPDATE',  // or 'zone.archived'
  old_data: oldZone,
  new_data: updatedZone,  // Contains deleted_at timestamp
  user_id: userId
});
```

**New Hard Delete Audit Logs**:
```javascript
// NEW: Audit log for hard delete
// IMPORTANT: Log BEFORE deletion, not after
const { data: zone } = await supabase
  .from('zones')
  .select('*')
  .eq('id', zoneId)
  .single();

await supabase.from('audit_logs').insert({
  table_name: 'zones',
  record_id: zoneId,
  action: 'DELETE',  // Standard SQL action
  old_data: zone,
  new_data: null,    // Zone is deleted, no new data
  user_id: userId,
  metadata: {
    permanent: true,
    deleted_at: new Date().toISOString(),
    zone_name: zone.name
  }
});

// Now perform the actual deletion
await supabase.from('zones').delete().eq('id', zoneId);
```

**Key Changes**:
- Create audit log **BEFORE** deletion (can't access data after)
- Set `action` to `'DELETE'` (not UPDATE)
- Set `new_data` to `null`
- Add `permanent: true` to metadata to distinguish from historical soft deletes
- Include zone name in metadata for reference

### 6. Error Handling Updates

Update error messages to reflect hard deletion:

**Before**:
```javascript
res.json({ 
  message: 'Zone archived successfully',
  data: updatedZone 
});
```

**After**:
```javascript
res.status(204).send();  // No content to return after deletion

// Or if you need to return a message:
res.json({ 
  message: 'Zone deleted permanently',
  zone_name: deletedZone.name 
});
```

## Testing Checklist

After implementing these changes, verify:

- [ ] Zone deletion removes the zone from the database entirely
- [ ] Zone deletion cascades to `zone_records` (no orphaned records)
- [ ] Zone deletion cascades to `zone_tags` (no orphaned tags)
- [ ] Audit logs are created BEFORE deletion with correct data
- [ ] Zone names become immediately available after deletion
- [ ] No queries reference `deleted_at` column
- [ ] Restore zone endpoints are removed or return 404
- [ ] `live` column filters still work correctly for other purposes
- [ ] Frontend receives appropriate responses (204 or success message)
- [ ] Error handling for non-existent zones works correctly

## Database Column Reference

### Zones Table After Migration

**Columns REMOVED**:
- ❌ `deleted_at` - No longer exists

**Columns RETAINED**:
- ✅ `live` - **Keep all logic using this column**
- ✅ All other columns remain unchanged

### Cascade Delete Behavior

When a zone is deleted:
1. All `zone_records` where `zone_id` matches are automatically deleted
2. All `zone_tags` where `zone_id` matches are automatically deleted
3. Audit logs are preserved (not cascade deleted)

## Migration Timeline

1. ✅ Frontend migration applied (this repo)
2. ⏳ Backend API changes (express repo) - **YOU ARE HERE**
3. ⏳ Apply database migration to dev environment
4. ⏳ Test thoroughly in dev
5. ⏳ Apply to staging
6. ⏳ Apply to production

## Support

For questions about this migration, refer to:
- Frontend repo: `supabase/migrations/20260107000000_remove_zone_soft_delete.sql`
- This documentation file
- Plan file: `.cursor/plans/zone_hard_delete_migration_*.plan.md`

## Breaking Changes Summary

**Frontend**: ✅ All changes applied
- Zone delete modal now requires exact zone name confirmation
- Success messages updated to reflect permanent deletion
- All `deleted_at` filters removed from queries

**Backend**: ⏳ Required changes
- `DELETE /api/zones/:id` must perform hard delete
- Remove all `deleted_at` filters from queries
- Remove restore endpoints
- Update audit logging to log BEFORE deletion
- Keep all `live` column logic intact

