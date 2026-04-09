-- TLD pricing table
CREATE TABLE public.tld_pricing (
  tld text PRIMARY KEY,
  wholesale_registration numeric(10,2) NOT NULL DEFAULT 0,
  wholesale_renewal numeric(10,2) NOT NULL DEFAULT 0,
  wholesale_transfer numeric(10,2) NOT NULL DEFAULT 0,
  sale_registration numeric(10,2),
  sale_renewal numeric(10,2),
  sale_transfer numeric(10,2),
  margin_override numeric(5,2),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- App settings table (key-value store)
CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed default global margin
INSERT INTO public.app_settings (key, value)
VALUES ('global_tld_margin', '30');

-- Enable RLS
ALTER TABLE public.tld_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.tld_pricing IS 'TLD wholesale and sale pricing with margin controls';
COMMENT ON TABLE public.app_settings IS 'Application-wide settings key-value store';
