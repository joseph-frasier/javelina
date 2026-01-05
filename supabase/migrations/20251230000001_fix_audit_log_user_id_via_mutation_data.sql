-- =====================================================
-- Fix Audit Log user_id Using Mutation Data Approach
-- =====================================================
-- 
-- This migration updates the audit log trigger to accept user_id
-- directly from the mutation data via _audit_user_id field.
--
-- Why this approach:
-- - Avoids connection pooling issues with session variables
-- - Explicit and debuggable
-- - Works reliably with Supabase JS client and service role
--
-- Backend controllers should pass _audit_user_id in mutations:
-- await supabaseAdmin.from('zones').update({
--   name: 'example.com',
--   _audit_user_id: req.user.id  // <-- Add this
-- })
-- =====================================================

-- =====================================================
-- Update Audit Log Trigger Function
-- =====================================================

create or replace function public.handle_audit_log()
returns trigger
language plpgsql
security definer
as $$
declare
  audit_user_id uuid;
begin
  -- Extract _audit_user_id from the mutation data if it exists
  -- For INSERT and UPDATE operations, check NEW record
  -- For DELETE operations, there's no NEW record, so use auth.uid()
  if TG_OP = 'DELETE' then
    audit_user_id := auth.uid();
  else
    -- Try to get user_id from mutation data first
    -- The _audit_user_id field is passed by the backend in the mutation
    begin
      audit_user_id := (NEW._audit_user_id)::uuid;
    exception
      when others then
        -- If _audit_user_id doesn't exist or is invalid, fall back to auth.uid()
        audit_user_id := auth.uid();
    end;
  end if;

  -- Insert audit log entry
  insert into public.audit_logs (table_name, record_id, action, old_data, new_data, user_id)
  values (
    TG_TABLE_NAME,
    coalesce(NEW.id, OLD.id),
    TG_OP,
    -- Capture old_data for both DELETE and UPDATE operations
    case 
      when TG_OP = 'DELETE' then to_jsonb(OLD)
      when TG_OP = 'UPDATE' then to_jsonb(OLD)
      else null 
    end,
    case when TG_OP in ('INSERT', 'UPDATE') then to_jsonb(NEW) else null end,
    audit_user_id
  );
  
  -- Remove _audit_user_id from NEW record so it doesn't get stored in the actual table
  -- This is important because _audit_user_id is not a real column
  if TG_OP in ('INSERT', 'UPDATE') then
    begin
      NEW._audit_user_id := null;
    exception
      when others then
        -- If the column doesn't exist (which is expected), that's fine
        null;
    end;
  end if;
  
  return coalesce(NEW, OLD);
end;
$$;

-- Add comment explaining the approach
comment on function public.handle_audit_log() is 
'Audit log trigger function. Captures INSERT/UPDATE/DELETE operations with both old and new data. 
Reads user_id from _audit_user_id field passed in mutation data by the backend, or falls back to auth.uid() for direct SQL operations.
The _audit_user_id field is removed from the final record before storage.';

-- =====================================================
-- Note: Keep set_user_context() for backward compatibility
-- =====================================================
-- The set_user_context() function created in the previous migration
-- is still available but no longer needed for this approach.
-- It can be used for testing or direct SQL operations if needed.
-- =====================================================

-- =====================================================
-- Backend Implementation Required
-- =====================================================
-- All mutation operations must pass _audit_user_id:
--
-- INSERT:
-- await supabaseAdmin.from('zones').insert({
--   name: 'example.com',
--   organization_id: orgId,
--   _audit_user_id: req.user.id
-- })
--
-- UPDATE:
-- await supabaseAdmin.from('zones').update({
--   name: 'updated.com',
--   _audit_user_id: req.user.id
-- }).eq('id', zoneId)
--
-- DELETE:
-- await supabaseAdmin.from('zones').delete()
--   .eq('id', zoneId)
-- Note: DELETE doesn't need _audit_user_id since there's no NEW record
-- =====================================================

-- =====================================================
-- Testing
-- =====================================================
-- To test this works:
--
-- 1. Insert with user context:
-- INSERT INTO zones (name, organization_id, _audit_user_id) 
-- VALUES ('test.com', 'org-uuid', 'user-uuid');
--
-- 2. Update with user context:
-- UPDATE zones 
-- SET name = 'updated.com', _audit_user_id = 'user-uuid'
-- WHERE id = 'zone-uuid';
--
-- 3. Check audit log:
-- SELECT user_id, action, old_data->>'name', new_data->>'name'
-- FROM audit_logs 
-- WHERE table_name = 'zones'
-- ORDER BY created_at DESC 
-- LIMIT 2;
--
-- Expected: Both records should have user_id populated
-- =====================================================

