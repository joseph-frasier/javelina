-- Migration: Update last_login on user sign-in
-- Description: Adds a trigger to update profiles.last_login whenever a user signs in
-- Date: 2026-01-12

-- =====================================================
-- 1. CREATE FUNCTION TO UPDATE LAST_LOGIN
-- =====================================================

create or replace function public.handle_user_login()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  -- Only update if last_sign_in_at has actually changed
  -- This prevents unnecessary updates on other auth.users changes
  if (OLD.last_sign_in_at is distinct from NEW.last_sign_in_at) then
    update public.profiles
    set last_login = NEW.last_sign_in_at
    where id = NEW.id;
  end if;
  
  return NEW;
end;
$$;

-- =====================================================
-- 2. CREATE TRIGGER ON AUTH.USERS
-- =====================================================

drop trigger if exists on_auth_user_login on auth.users;

create trigger on_auth_user_login
  after update on auth.users
  for each row
  when (OLD.last_sign_in_at is distinct from NEW.last_sign_in_at)
  execute procedure public.handle_user_login();

