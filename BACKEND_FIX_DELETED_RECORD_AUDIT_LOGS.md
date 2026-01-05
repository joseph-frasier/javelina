# Backend Fix: Zone Audit Logs Not Showing Deleted Records

## Problem

When a DNS record is deleted, its audit log disappears from the zone's change history. This is because the backend query fetches current record IDs and then filters audit logs by those IDs:

```javascript
// Get all CURRENT record IDs for this zone
const { data: records } = await supabase
  .from('zone_records')
  .select('id')
  .eq('zone_id', zoneId);

const recordIds = records?.map(r => r.id) || [];

// This EXCLUDES deleted records!
.or(`...,and(table_name.eq.zone_records,record_id.in.(${recordIds.join(',')}))`)
```

**Result**: Deleted records aren't in `zone_records` table anymore, so their IDs aren't in the `recordIds` array, so their audit logs are filtered out.

## Solution

Instead of filtering by record IDs, filter zone_records audit logs by the `zone_id` stored in the record data. The audit log captures the full record in `old_data` and `new_data`, which includes the `zone_id`.

### Updated Backend Code

Replace the audit logs query in `GET /api/zones/:id/audit-logs`:

**BEFORE (BROKEN):**
```javascript
// Get all record IDs for this zone
const { data: records } = await supabase
  .from('zone_records')
  .select('id')
  .eq('zone_id', zoneId);

const recordIds = records?.map(r => r.id) || [];

// Fetch audit logs - EXCLUDES deleted records!
const { data: auditLogs, error } = await supabase
  .from('audit_logs')
  .select('*')
  .or(`and(table_name.eq.zones,record_id.eq.${zoneId}),and(table_name.eq.zone_records,record_id.in.(${recordIds.join(',')}))`)
  .order('created_at', { ascending: false })
  .limit(50);
```

**AFTER (FIXED):**
```javascript
// Fetch audit logs for zone and its records
// For zone_records, we need to check if the record belonged to this zone
// by looking at the zone_id in old_data or new_data
const { data: allAuditLogs, error } = await supabase
  .from('audit_logs')
  .select('*')
  .in('table_name', ['zones', 'zone_records'])
  .order('created_at', { ascending: false });

if (error) {
  return res.status(500).json({ error: error.message });
}

// Filter audit logs:
// 1. Include all zone logs where record_id = zoneId
// 2. Include all zone_records logs where zone_id in data matches zoneId
const auditLogs = allAuditLogs.filter(log => {
  if (log.table_name === 'zones' && log.record_id === zoneId) {
    return true;
  }
  
  if (log.table_name === 'zone_records') {
    // Check zone_id in new_data (for INSERT/UPDATE) or old_data (for DELETE)
    const zoneIdInData = log.new_data?.zone_id || log.old_data?.zone_id;
    return zoneIdInData === zoneId;
  }
  
  return false;
}).slice(0, 50); // Limit to 50 after filtering
```

## Why This Works

- **INSERT**: `new_data.zone_id` contains the zone ID
- **UPDATE**: `new_data.zone_id` or `old_data.zone_id` contains the zone ID  
- **DELETE**: `old_data.zone_id` contains the zone ID (the deleted record)

This approach captures ALL audit logs for records that ever belonged to the zone, including deleted ones.

## Alternative Solution (Better Performance)

If the above filtering is slow, add a `zone_id` column to the `audit_logs` table and populate it via trigger. This would allow direct database filtering without loading all audit logs.

## Testing

After applying the fix:

1. Create a DNS record
2. Verify you see the CREATE audit log
3. Delete the DNS record  
4. **Verify you see BOTH the CREATE and DELETE audit logs**

The DELETE log should show the full record data in `old_data`.

