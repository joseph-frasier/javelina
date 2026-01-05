-- =====================================================
-- Fix Audit Log Trigger to Capture old_data and user_id
-- =====================================================
-- 
-- This migration fixes two critical issues with audit logging:
-- 1. old_data is not captured for UPDATE operations (only for DELETE)
-- 2. user_id is NULL when operations go through Express backend
--
-- The fix:
-- 1. Capture old_data for UPDATE operations
-- 2. Read user_id from session variable set by Express backend
-- 3. Fallback to auth.uid() for direct Supabase operations
-- =====================================================

-- =====================================================
-- 1. Create User Context Helper Function
-- =====================================================

-- This function allows the Express backend to set the current user context
-- before performing database operations. The trigger can then read this value.
create or replace function public.set_user_context(user_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  -- Set a session-scoped configuration parameter
  -- The 'true' flag makes it transaction-scoped (resets after transaction)
  perform set_config('app.current_user_id', user_id::text, true);
end;
$$;

-- Grant execute permission to authenticated users and service role
grant execute on function public.set_user_context(uuid) to authenticated, service_role;

-- Add comment for documentation
comment on function public.set_user_context(uuid) is 
'Sets the current user context for audit logging. Should be called by the Express API before any INSERT/UPDATE/DELETE operations. The value is transaction-scoped and automatically resets after the transaction completes.';

-- =====================================================
-- 2. Update Audit Log Trigger Function
-- =====================================================

create or replace function public.handle_audit_log()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.audit_logs (table_name, record_id, action, old_data, new_data, user_id)
  values (
    TG_TABLE_NAME,
    coalesce(NEW.id, OLD.id),
    TG_OP,
    -- FIX 1: Capture old_data for both DELETE and UPDATE operations
    case 
      when TG_OP = 'DELETE' then to_jsonb(OLD)
      when TG_OP = 'UPDATE' then to_jsonb(OLD)
      else null 
    end,
    case when TG_OP in ('INSERT', 'UPDATE') then to_jsonb(NEW) else null end,
    -- FIX 2: Try to get user_id from session variable first, fallback to auth.uid()
    coalesce(
      -- Try to read from session variable set by set_user_context()
      nullif(current_setting('app.current_user_id', true), '')::uuid,
      -- Fallback to auth.uid() for direct Supabase operations (e.g., from SQL editor)
      auth.uid()
    )
  );
  return coalesce(NEW, OLD);
end;
$$;

-- Add comment explaining the fix
comment on function public.handle_audit_log() is 
'Audit log trigger function. Captures INSERT/UPDATE/DELETE operations with both old and new data. Reads user_id from session variable (set by Express API via set_user_context) or falls back to auth.uid() for direct operations.';

-- =====================================================
-- No need to recreate triggers - they already exist
-- =====================================================
-- The triggers are already attached to the tables from previous migrations:
-- - organizations_audit
-- - zones_audit  
-- - zone_records_audit
-- 
-- Since we only modified the trigger FUNCTION, not the triggers themselves,
-- the existing triggers will automatically use the updated function.
-- =====================================================

-- =====================================================
-- Verification Query (for testing)
-- =====================================================
-- After deploying, you can verify the fix works by:
-- 
-- 1. Set user context:
--    SELECT set_user_context('your-user-id-uuid');
--
-- 2. Perform an update:
--    UPDATE zones SET name = 'test.com' WHERE id = 'zone-id';
--
-- 3. Check audit log:
--    SELECT * FROM audit_logs WHERE table_name = 'zones' ORDER BY created_at DESC LIMIT 1;
--    
--    Should show:
--    - old_data: JSON with original zone values
--    - new_data: JSON with updated zone values
--    - user_id: Your user ID (not NULL)
-- =====================================================

