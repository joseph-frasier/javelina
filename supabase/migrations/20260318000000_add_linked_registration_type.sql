-- Add 'linked' as a valid registration_type for domains imported from the OpenSRS storefront

alter table public.domains
  drop constraint domains_registration_type_check;

alter table public.domains
  add constraint domains_registration_type_check
    check (registration_type in ('new', 'transfer', 'linked'));
