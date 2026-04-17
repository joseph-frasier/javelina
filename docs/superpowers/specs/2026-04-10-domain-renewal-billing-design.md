# Domain Auto-Renewal Billing Design

## Problem

When auto-renew is enabled on a domain, OpenSRS charges the reseller account at wholesale cost. Javelina does not bill the customer for auto-renewals — only manual renewals go through Stripe checkout with our margin applied. This is a revenue leak.

## Solution: Pre-Charge Renewals

Bill customers in advance of their renewal date at Javelina pricing. If payment fails, disable auto-renew so OpenSRS doesn't charge the reseller.

## How It Works

### 1. Renewal Billing Job (runs daily)

A scheduled job checks for domains expiring within the next 30 days that have auto-renew enabled:

```
SELECT d.id, d.domain_name, d.tld, d.expires_at, d.user_id, d.auto_renew
FROM domains d
LEFT JOIN domain_renewal_invoices ri 
  ON ri.domain_id = d.id 
  AND ri.renewal_period_end >= d.expires_at
WHERE d.auto_renew = true
  AND d.status = 'active'
  AND d.expires_at <= NOW() + INTERVAL '30 days'
  AND ri.id IS NULL  -- no invoice already created for this renewal period
```

### 2. For each upcoming renewal:

1. Look up Javelina sale price for the domain's TLD from `tld_pricing` table
2. Create a Stripe Invoice for the customer with:
   - Line item: "Domain Renewal: example.com (1 year)"
   - Amount: Javelina sale price (wholesale + margin)
   - Due date: 7 days before domain expiry
   - Metadata: `{ type: "domain_renewal", domain_id, domain_name }`
3. Record the invoice in a new `domain_renewal_invoices` table
4. Stripe auto-attempts payment using customer's saved payment method

### 3. Payment outcomes:

**Payment succeeds:**
- Mark invoice as paid in `domain_renewal_invoices`
- Auto-renew proceeds normally when OpenSRS renews the domain
- OpenSRS charges reseller at wholesale; customer was pre-charged at margin price

**Payment fails (after Stripe retry attempts):**
- Disable auto-renew on the domain via OpenSRS API
- Update domain record: `auto_renew = false`
- Send email notification to customer: "Your domain renewal payment failed. Auto-renew has been disabled. Please renew manually to avoid losing your domain."
- Mark invoice as failed in `domain_renewal_invoices`

### 4. Email notifications:

- **30 days before expiry:** "Your domain is renewing soon. We'll charge $X.XX on [date]."
- **Payment succeeded:** "Domain renewal payment confirmed for example.com"
- **Payment failed:** "Action required: renewal payment failed for example.com"

## Database

### New table: `domain_renewal_invoices`

```sql
CREATE TABLE public.domain_renewal_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id uuid NOT NULL REFERENCES public.domains(id),
  user_id uuid NOT NULL,
  stripe_invoice_id text,
  amount numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'cancelled')),
  renewal_period_start timestamptz,
  renewal_period_end timestamptz,
  due_date timestamptz,
  paid_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.domain_renewal_invoices ENABLE ROW LEVEL SECURITY;
```

## Backend Components

### New files:
- `src/jobs/domain-renewal-billing.ts` — the daily job that finds upcoming renewals and creates invoices
- `src/controllers/renewalBillingController.ts` — webhook handlers for invoice payment success/failure

### Modified files:
- `src/controllers/stripeController.ts` — add handlers for `invoice.paid` and `invoice.payment_failed` with `type: "domain_renewal"` metadata
- `src/routes/admin.ts` — optional admin endpoint to view pending renewal invoices

## Frontend Components

### Customer-facing:
- Domain detail page: show upcoming renewal invoice status ("Renewal payment of $X.XX scheduled for [date]")
- Billing page: list renewal invoices alongside subscription invoices

### Admin-facing:
- Admin dashboard: view all pending/failed renewal invoices
- Ability to manually retry or cancel renewal invoices

## Job Scheduling

The daily job can be triggered via:
- A cron job (Railway cron or external scheduler)
- A Supabase Edge Function on a schedule
- A simple `setInterval` in the Express app (not ideal for production)

Recommended: Railway cron job or Supabase pg_cron calling an authenticated API endpoint.

## Edge Cases

- **Domain transferred away:** Check domain status before creating invoice. Skip if status is not `active`.
- **Customer cancels before renewal:** Allow canceling a pending renewal invoice, which also disables auto-renew.
- **Price changes between invoice creation and renewal:** Use the price at invoice creation time (already locked in).
- **Multiple years:** Current system only handles 1-year renewals. Multi-year can be added later.
- **Linked domains without a Stripe customer:** These customers came from the storefront and may not have a payment method on file. The job should skip them or prompt them to add a payment method.

## Priority

Low — this is a revenue optimization that should be implemented after the core mailbox feature ships and is validated.
