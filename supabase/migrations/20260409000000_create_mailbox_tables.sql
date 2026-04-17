-- Mailbox pricing tiers (admin-managed)
CREATE TABLE public.mailbox_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_name text NOT NULL UNIQUE,
  storage_gb integer NOT NULL,
  opensrs_cost numeric(10,2) NOT NULL,
  margin_percent numeric(5,2) NOT NULL DEFAULT 50,
  sale_price_override numeric(10,2),
  mailbox_limit integer NOT NULL DEFAULT 0,
  stripe_product_id text,
  stripe_price_id text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Domain email enablement tracking
CREATE TABLE public.domain_mailboxes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id uuid NOT NULL REFERENCES public.domains(id) ON DELETE CASCADE,
  tier_id uuid NOT NULL REFERENCES public.mailbox_pricing(id),
  opensrs_mail_domain text,
  stripe_subscription_id text,
  stripe_customer_id text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'disabled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(domain_id)
);

-- Seed default pricing tiers
INSERT INTO public.mailbox_pricing (tier_name, storage_gb, opensrs_cost, margin_percent, mailbox_limit) VALUES
  ('Basic', 5, 0.50, 75, 0),
  ('Pro', 25, 2.50, 50, 0),
  ('Business', 50, 5.00, 50, 0),
  ('Enterprise', 100, 10.00, 44, 0);

-- Enable RLS
ALTER TABLE public.mailbox_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domain_mailboxes ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.mailbox_pricing IS 'Admin-configurable mailbox pricing tiers';
COMMENT ON TABLE public.domain_mailboxes IS 'Tracks which domains have email enabled and their tier';
