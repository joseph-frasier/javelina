-- ================================================================
-- Trigger: Prevent removing or demoting the last admin from an org
-- ================================================================
-- Atomically prevents the race condition where two concurrent
-- DELETE/UPDATE requests both see "1 other admin" and both proceed,
-- leaving the org with 0 admins.
-- ================================================================

-- Trigger function: block DELETE if this is the last admin
CREATE OR REPLACE FUNCTION public.prevent_last_admin_removal()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_remaining_admins INTEGER;
BEGIN
  -- Only check if the member being removed is an admin
  IF OLD.role NOT IN ('SuperAdmin', 'Admin') THEN
    RETURN OLD;
  END IF;

  -- Count remaining admins EXCLUDING the one being removed
  SELECT COUNT(*) INTO v_remaining_admins
  FROM public.organization_members
  WHERE organization_id = OLD.organization_id
    AND user_id != OLD.user_id
    AND role IN ('SuperAdmin', 'Admin');

  IF v_remaining_admins = 0 THEN
    RAISE EXCEPTION 'Cannot remove the last admin from organization %. At least one SuperAdmin or Admin must remain.',
      OLD.organization_id
      USING ERRCODE = 'P0001';
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_last_admin_removal ON public.organization_members;

CREATE TRIGGER trg_prevent_last_admin_removal
  BEFORE DELETE ON public.organization_members
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_last_admin_removal();

-- Trigger function: block UPDATE that demotes the last admin
CREATE OR REPLACE FUNCTION public.prevent_last_admin_demotion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_remaining_admins INTEGER;
BEGIN
  -- Only check if an admin is being demoted to a non-admin role
  IF OLD.role NOT IN ('SuperAdmin', 'Admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.role IN ('SuperAdmin', 'Admin') THEN
    RETURN NEW;
  END IF;

  -- Admin is being demoted -- check if they're the last one
  SELECT COUNT(*) INTO v_remaining_admins
  FROM public.organization_members
  WHERE organization_id = OLD.organization_id
    AND user_id != OLD.user_id
    AND role IN ('SuperAdmin', 'Admin');

  IF v_remaining_admins = 0 THEN
    RAISE EXCEPTION 'Cannot demote the last admin in organization %. At least one SuperAdmin or Admin must remain.',
      OLD.organization_id
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_last_admin_demotion ON public.organization_members;

CREATE TRIGGER trg_prevent_last_admin_demotion
  BEFORE UPDATE OF role ON public.organization_members
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_last_admin_demotion();
