-- =====================================================
-- Fix Audit Log Trigger to Use Session Variable
-- =====================================================
-- The trigger needs to read from app.current_user_id session variable
-- which is set by the *_with_audit functions

CREATE OR REPLACE FUNCTION public.handle_audit_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.audit_logs (table_name, record_id, action, old_data, new_data, user_id)
  VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    -- Capture old_data for both DELETE and UPDATE operations
    CASE 
      WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD)
      WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD)
      ELSE NULL 
    END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    -- Read user_id from session variable set by *_with_audit functions
    COALESCE(
      NULLIF(current_setting('app.current_user_id', true), '')::uuid,
      auth.uid()
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

