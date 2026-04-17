-- Fix: storefront_subscriptions.user_id should reference profiles, not auth.users
ALTER TABLE public.storefront_subscriptions
  DROP CONSTRAINT storefront_subscriptions_user_id_fkey;

ALTER TABLE public.storefront_subscriptions
  ADD CONSTRAINT storefront_subscriptions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id);
