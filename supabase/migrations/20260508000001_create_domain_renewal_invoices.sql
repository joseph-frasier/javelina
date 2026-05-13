-- JAV-100: Pre-charge auto-renewals via Stripe Invoice + disable auto-renew on failure.
-- Applied manually to dev branch (project ref: ipfsrbxjgewhdcvonrbo).

CREATE TABLE public.domain_renewal_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id uuid NOT NULL REFERENCES public.domains(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_invoice_id text,
  amount numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','paid','failed','cancelled')),
  renewal_period_start timestamptz,
  renewal_period_end timestamptz,
  due_date timestamptz,
  paid_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_domain_renewal_invoices_domain_id
  ON public.domain_renewal_invoices(domain_id);

CREATE INDEX idx_domain_renewal_invoices_user_id
  ON public.domain_renewal_invoices(user_id);

CREATE UNIQUE INDEX idx_domain_renewal_invoices_stripe_id
  ON public.domain_renewal_invoices(stripe_invoice_id)
  WHERE stripe_invoice_id IS NOT NULL;

ALTER TABLE public.domain_renewal_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own renewal invoices"
  ON public.domain_renewal_invoices
  FOR SELECT
  USING (auth.uid() = user_id);
