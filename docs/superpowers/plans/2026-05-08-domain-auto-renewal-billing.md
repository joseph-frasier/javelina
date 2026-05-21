# Domain Auto-Renewal Billing (JAV-100) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pre-charge customers via Stripe Invoice 30 days before domain expiry; if payment fails after retries, disable auto-renew so OpenSRS doesn't bill the reseller.

**Architecture:** Daily cron creates Stripe one-off Invoices and a `domain_renewal_invoices` row per upcoming renewal; the existing Stripe webhook handler routes `invoice.paid` / `invoice.payment_failed` for `metadata.type === "domain_renewal"` to a new handler that updates the row and (on failure) disables auto-renew via OpenSRS.

**Tech Stack:** Express + TypeScript, Stripe Node SDK, Supabase Postgres, node-cron, OpenSRS reseller API.

**Spec:** `docs/superpowers/specs/2026-04-10-domain-renewal-billing-design.md` (existing), with the cross-cutting context in `docs/superpowers/specs/2026-05-08-domain-tickets-design.md` § Stream A.

**Both repos must be on `fix/domain-transfer` before starting.**

---

## File Map

### `javelina-backend/`
- Create: `src/jobs/domain-renewal-billing.ts` — daily cron creating invoices
- Modify: `src/controllers/stripeController.ts` — route `domain_renewal` invoices to a new handler; add the handler
- Modify: `src/controllers/domainsController.ts` — extend `getDomainManagement` to include `upcoming_renewal_invoice`
- Modify: `src/index.ts` — start the new cron alongside `startExpiryReminderJob()`
- Modify: `src/services/__tests__/` (or `controllers/__tests__/`) — unit tests

### `javelina/` (frontend)
- Modify: `types/domains.ts` — add `upcoming_renewal_invoice` to `DomainManagementResponse`
- Modify: `app/domains/[id]/page.tsx` — surface the upcoming pre-charge in the Renewal section

### Database
- Migration: `<timestamp>_create_domain_renewal_invoices.sql`

---

## Migration (apply manually before Task 1)

Save to `javelina-backend/supabase/migrations/<timestamp>_create_domain_renewal_invoices.sql`:

```sql
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

CREATE INDEX idx_domain_renewal_invoices_domain_id ON public.domain_renewal_invoices(domain_id);
CREATE INDEX idx_domain_renewal_invoices_user_id ON public.domain_renewal_invoices(user_id);
CREATE UNIQUE INDEX idx_domain_renewal_invoices_stripe_id
  ON public.domain_renewal_invoices(stripe_invoice_id)
  WHERE stripe_invoice_id IS NOT NULL;

ALTER TABLE public.domain_renewal_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own renewal invoices"
  ON public.domain_renewal_invoices FOR SELECT
  USING (auth.uid() = user_id);
```

Apply manually to dev branch (`ipfsrbxjgewhdcvonrbo`). Confirm with `\d public.domain_renewal_invoices` before starting tasks.

---

## Task 1: Daily renewal billing cron — skeleton + DB query

**Files:**
- Create: `javelina-backend/src/jobs/domain-renewal-billing.ts`

- [ ] **Step 1: Create the cron skeleton**

```ts
import cron from "node-cron";
import Stripe from "stripe";
import { supabaseAdmin } from "../config/supabase";
import { stripe } from "../config/stripe";
import { getDomainPrice } from "../services/opensrs";

const PRECHARGE_DAYS_BEFORE = 30;
const DUE_DAYS_BEFORE = 7;

interface DomainRow {
  id: string;
  domain_name: string;
  tld: string;
  expires_at: string;
  user_id: string;
  status: string;
}

export function startDomainRenewalBillingJob() {
  // Runs daily at 8:00 UTC
  cron.schedule("0 8 * * *", async () => {
    console.log("[Renewal Billing] Running daily check...");
    try {
      await runDomainRenewalBilling();
    } catch (err: any) {
      console.error("[Renewal Billing] Cron error:", err.message);
    }
  });
  console.log("✅ Domain renewal billing cron scheduled (daily 8:00 UTC)");
}

export async function runDomainRenewalBilling(): Promise<void> {
  const cutoff = new Date(
    Date.now() + PRECHARGE_DAYS_BEFORE * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data, error } = await supabaseAdmin
    .from("domains")
    .select("id, domain_name, tld, expires_at, user_id, status")
    .eq("auto_renew", true)
    .eq("status", "active")
    .lte("expires_at", cutoff);

  if (error) {
    console.error("[Renewal Billing] Query error:", error.message);
    return;
  }
  if (!data || data.length === 0) return;

  for (const domain of data as DomainRow[]) {
    try {
      await processDomainRenewal(domain);
    } catch (err: any) {
      console.error(`[Renewal Billing] ${domain.domain_name} failed:`, err.message);
    }
  }
}

async function processDomainRenewal(domain: DomainRow): Promise<void> {
  // Skip if we already created an invoice covering this renewal period
  const { data: existing } = await supabaseAdmin
    .from("domain_renewal_invoices")
    .select("id")
    .eq("domain_id", domain.id)
    .gte("renewal_period_end", domain.expires_at)
    .maybeSingle();
  if (existing) return;

  const pricing = await getDomainPrice(domain.domain_name, "renewal");
  if (!pricing) {
    console.warn(`[Renewal Billing] No pricing for ${domain.domain_name}`);
    return;
  }

  const dueDate = new Date(
    new Date(domain.expires_at).getTime() - DUE_DAYS_BEFORE * 24 * 60 * 60 * 1000
  );

  await createRenewalInvoice(domain, pricing.price, pricing.currency, dueDate);
}

async function createRenewalInvoice(
  domain: DomainRow,
  amount: number,
  currency: string,
  dueDate: Date
): Promise<void> {
  // Implementation in Task 2
  throw new Error("not implemented");
}
```

- [ ] **Step 2: Compile check**

Run: `cd javelina-backend && npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
cd javelina-backend
git add src/jobs/domain-renewal-billing.ts
git commit -m "feat(billing): scaffold domain renewal billing cron"
```

---

## Task 2: Stripe Invoice creation

**Files:**
- Modify: `javelina-backend/src/jobs/domain-renewal-billing.ts`

- [ ] **Step 1: Implement `createRenewalInvoice`**

Replace the stub `createRenewalInvoice` with:

```ts
async function createRenewalInvoice(
  domain: DomainRow,
  amount: number,
  currency: string,
  dueDate: Date
): Promise<void> {
  // Look up the user's Stripe customer id (subscriptions table is the source of truth)
  const { data: subRow } = await supabaseAdmin
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", domain.user_id)
    .not("stripe_customer_id", "is", null)
    .limit(1)
    .maybeSingle();

  const customerId = subRow?.stripe_customer_id;
  if (!customerId) {
    console.warn(
      `[Renewal Billing] No Stripe customer for user ${domain.user_id}; skipping ${domain.domain_name}`
    );
    return;
  }

  const periodStart = new Date(domain.expires_at);
  const periodEnd = new Date(periodStart);
  periodEnd.setFullYear(periodEnd.getFullYear() + 1);

  // Insert pending row first so we have an id even if Stripe call fails partway
  const { data: invRow, error: insertErr } = await supabaseAdmin
    .from("domain_renewal_invoices")
    .insert({
      domain_id: domain.id,
      user_id: domain.user_id,
      amount,
      currency,
      status: "pending",
      renewal_period_start: periodStart.toISOString(),
      renewal_period_end: periodEnd.toISOString(),
      due_date: dueDate.toISOString(),
    })
    .select("id")
    .single();

  if (insertErr || !invRow) {
    console.error("[Renewal Billing] Insert error:", insertErr?.message);
    return;
  }

  // Create the Stripe Invoice with line item
  const invoice = await stripe.invoices.create({
    customer: customerId,
    auto_advance: true,
    collection_method: "charge_automatically",
    due_date: Math.floor(dueDate.getTime() / 1000),
    metadata: {
      type: "domain_renewal",
      domain_id: domain.id,
      domain_renewal_invoice_id: invRow.id,
      domain_name: domain.domain_name,
    },
  });

  await stripe.invoiceItems.create({
    customer: customerId,
    invoice: invoice.id,
    amount: Math.round(amount * 100),
    currency,
    description: `Domain Renewal: ${domain.domain_name} (1 year)`,
    metadata: {
      type: "domain_renewal",
      domain_id: domain.id,
      domain_name: domain.domain_name,
    },
  });

  await stripe.invoices.finalizeInvoice(invoice.id);

  await supabaseAdmin
    .from("domain_renewal_invoices")
    .update({
      stripe_invoice_id: invoice.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", invRow.id);

  console.log(
    `[Renewal Billing] Created invoice ${invoice.id} for ${domain.domain_name} ($${amount.toFixed(2)})`
  );
}
```

- [ ] **Step 2: Compile check**

Run: `cd javelina-backend && npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
cd javelina-backend
git add src/jobs/domain-renewal-billing.ts
git commit -m "feat(billing): create Stripe Invoice for upcoming domain renewals"
```

---

## Task 3: Stripe webhook routing for `domain_renewal`

**Files:**
- Modify: `javelina-backend/src/controllers/stripeController.ts`

- [ ] **Step 1: Add handlers**

Append (or place near other event handlers in `stripeController.ts`):

```ts
import { setAutoRenew as opensrsSetAutoRenew } from "../services/opensrs";

async function handleDomainRenewalInvoicePaid(invoice: Stripe.Invoice) {
  const meta = invoice.metadata || {};
  const renewalInvoiceId = meta.domain_renewal_invoice_id;
  if (!renewalInvoiceId) return;

  await supabaseAdmin
    .from("domain_renewal_invoices")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", renewalInvoiceId);

  console.log(`[Renewal Billing] Marked paid: ${renewalInvoiceId}`);
}

async function handleDomainRenewalInvoiceFailed(invoice: Stripe.Invoice) {
  const meta = invoice.metadata || {};
  const renewalInvoiceId = meta.domain_renewal_invoice_id;
  const domainId = meta.domain_id;
  if (!renewalInvoiceId || !domainId) return;

  await supabaseAdmin
    .from("domain_renewal_invoices")
    .update({
      status: "failed",
      failed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", renewalInvoiceId);

  // Disable auto-renew so OpenSRS doesn't charge reseller at wholesale
  const { data: domain } = await supabaseAdmin
    .from("domains")
    .select("id, domain_name, auto_renew")
    .eq("id", domainId)
    .single();

  if (domain && domain.auto_renew) {
    try {
      await opensrsSetAutoRenew(domain.domain_name, false);
    } catch (err: any) {
      console.error("[Renewal Billing] OpenSRS setAutoRenew failed:", err.message);
    }
    await supabaseAdmin
      .from("domains")
      .update({ auto_renew: false, updated_at: new Date().toISOString() })
      .eq("id", domainId);
  }

  console.log(`[Renewal Billing] Marked failed + disabled auto-renew: ${renewalInvoiceId}`);
}
```

- [ ] **Step 2: Route inside the `switch (event.type)` block**

In `handleWebhook`'s switch (`stripeController.ts:1393`), modify the `invoice.paid` and `invoice.payment_failed` cases to branch on metadata:

```ts
case "invoice.paid": {
  const inv = event.data.object as Stripe.Invoice;
  if (inv.metadata?.type === "domain_renewal") {
    await handleDomainRenewalInvoicePaid(inv);
  } else {
    await handleInvoicePaymentSucceeded(inv, stripe);
  }
  break;
}

case "invoice.payment_failed": {
  const inv = event.data.object as Stripe.Invoice;
  if (inv.metadata?.type === "domain_renewal") {
    await handleDomainRenewalInvoiceFailed(inv);
  } else {
    await handleInvoicePaymentFailed(inv);
  }
  break;
}
```

- [ ] **Step 3: Compile check**

Run: `cd javelina-backend && npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
cd javelina-backend
git add src/controllers/stripeController.ts
git commit -m "feat(billing): route domain_renewal Stripe webhooks (JAV-100)"
```

---

## Task 4: Register the cron

**Files:**
- Modify: `javelina-backend/src/index.ts`

- [ ] **Step 1: Wire into startup**

Find the `startExpiryReminderJob()` call. Add after it:

```ts
import { startDomainRenewalBillingJob } from "./jobs/domain-renewal-billing";
// ...
startDomainRenewalBillingJob();
```

- [ ] **Step 2: Compile check**

Run: `cd javelina-backend && npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
cd javelina-backend
git add src/index.ts
git commit -m "feat(billing): register domain renewal billing cron at startup"
```

---

## Task 5: Surface upcoming invoice on detail page

**Files:**
- Modify: `javelina-backend/src/controllers/domainsController.ts`
- Modify: `javelina/types/domains.ts`
- Modify: `javelina/app/domains/[id]/page.tsx`

- [ ] **Step 1: Backend — extend `getDomainManagement` response**

Inside `getDomainManagement` controller, before `sendSuccess`, add:

```ts
const { data: upcomingRow } = await supabaseAdmin
  .from("domain_renewal_invoices")
  .select("amount, currency, due_date, status")
  .eq("domain_id", domain.id)
  .in("status", ["pending", "failed"])
  .order("due_date", { ascending: true })
  .limit(1)
  .maybeSingle();

const upcoming_renewal_invoice = upcomingRow
  ? {
      amount: Number(upcomingRow.amount),
      currency: upcomingRow.currency,
      due_date: upcomingRow.due_date,
      status: upcomingRow.status,
    }
  : undefined;
```

Add `upcoming_renewal_invoice` to the `sendSuccess` response object.

- [ ] **Step 2: Frontend — extend the type**

Edit `javelina/types/domains.ts`. In `DomainManagementResponse`, add:

```ts
upcoming_renewal_invoice?: {
  amount: number;
  currency: string;
  due_date: string;
  status: 'pending' | 'paid' | 'failed';
};
```

- [ ] **Step 3: Frontend — render the line in the Renewal section**

Edit `app/domains/[id]/page.tsx`. In the Renewal section (search for `Renew Domain` button), insert above the renew button:

```tsx
{data.upcoming_renewal_invoice && (
  <div className="text-sm text-gray-600 dark:text-gray-400">
    {data.upcoming_renewal_invoice.status === 'failed' ? (
      <span className="text-red-600 dark:text-red-400 font-medium">
        Auto-renewal payment failed. Auto-renew has been disabled.
      </span>
    ) : (
      <>
        Auto-renewal payment of{' '}
        <strong>
          ${data.upcoming_renewal_invoice.amount.toFixed(2)}{' '}
          {data.upcoming_renewal_invoice.currency.toUpperCase()}
        </strong>{' '}
        scheduled for{' '}
        <strong>
          {new Date(data.upcoming_renewal_invoice.due_date).toLocaleDateString()}
        </strong>
        .
      </>
    )}
  </div>
)}
```

- [ ] **Step 4: Compile check**

Run: `cd javelina-backend && npx tsc --noEmit && cd ../javelina && npx tsc --noEmit`
Expected: zero errors in both.

- [ ] **Step 5: Commit (in each repo)**

```bash
cd javelina-backend
git add src/controllers/domainsController.ts
git commit -m "feat(billing): include upcoming_renewal_invoice in management response"
cd ../javelina
git add types/domains.ts app/domains/[id]/page.tsx
git commit -m "feat(billing): show upcoming renewal pre-charge on detail page"
```

---

## Task 6: Unit tests

**Files:**
- Create: `javelina-backend/src/jobs/__tests__/domain-renewal-billing.test.ts`

- [ ] **Step 1: Mock Stripe + Supabase and test the orchestration**

```ts
import { runDomainRenewalBilling } from "../domain-renewal-billing";

jest.mock("../../config/supabase", () => {
  const chain: any = {
    select: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    lte: jest.fn(() => chain),
    gte: jest.fn(() => chain),
    in: jest.fn(() => chain),
    order: jest.fn(() => chain),
    not: jest.fn(() => chain),
    limit: jest.fn(() => chain),
    maybeSingle: jest.fn(() => Promise.resolve({ data: null })),
    single: jest.fn(() => Promise.resolve({ data: null, error: null })),
    insert: jest.fn(() => chain),
    update: jest.fn(() => chain),
  };
  return {
    supabaseAdmin: { from: jest.fn(() => chain) },
  };
});
jest.mock("../../config/stripe", () => ({
  stripe: {
    invoices: {
      create: jest.fn().mockResolvedValue({ id: "in_123" }),
      finalizeInvoice: jest.fn().mockResolvedValue({}),
    },
    invoiceItems: { create: jest.fn().mockResolvedValue({}) },
  },
}));
jest.mock("../../services/opensrs", () => ({
  getDomainPrice: jest.fn().mockResolvedValue({ price: 14.99, currency: "usd", tld: ".com" }),
}));

describe("runDomainRenewalBilling", () => {
  it("returns gracefully when no domains are eligible", async () => {
    await expect(runDomainRenewalBilling()).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests**

Run: `cd javelina-backend && npx jest src/jobs/__tests__/domain-renewal-billing.test.ts`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
cd javelina-backend
git add src/jobs/__tests__/domain-renewal-billing.test.ts
git commit -m "test(billing): smoke test for renewal billing job"
```

---

## Task 7: Manual smoke test

- [ ] **Step 1: Trigger the job ad-hoc**

Add a temporary one-off script (don't commit):

```bash
cd javelina-backend
npx ts-node -e "require('./src/jobs/domain-renewal-billing').runDomainRenewalBilling().then(() => process.exit(0))"
```

- [ ] **Step 2: Verify a Stripe Invoice was created**

In Stripe dashboard (test mode), filter invoices by metadata `type=domain_renewal`. Confirm:
- Invoice exists with the expected amount.
- Customer matches the domain owner.
- Metadata includes `domain_id`, `domain_renewal_invoice_id`.

- [ ] **Step 3: Verify the DB row**

```sql
SELECT * FROM domain_renewal_invoices ORDER BY created_at DESC LIMIT 5;
```
Expected: row with `status='pending'`, matching `stripe_invoice_id`.

- [ ] **Step 4: Simulate webhook payment**

Use Stripe CLI:
```bash
stripe trigger invoice.paid --override invoice:metadata.type=domain_renewal
```
Expected: row flips to `status='paid'`, `paid_at` set.

- [ ] **Step 5: Simulate failure path**

```bash
stripe trigger invoice.payment_failed --override invoice:metadata.type=domain_renewal
```
Expected: row flips to `status='failed'`, `domains.auto_renew` flips to `false` for that domain, OpenSRS `setAutoRenew(false)` was called (check backend logs).

- [ ] **Step 6: Verify UI surface**

Open the domain detail page → confirm the upcoming-renewal line appears in the Renewal section.

---

## Self-Review

- **Spec coverage:** Pre-charge job (Task 1, 2) → spec § 1, 2. Webhook routing + failure handling (Task 3) → spec § 3. Cron registration (Task 4). UI surface (Task 5) → spec § Frontend Components. Tests (Task 6, 7).
- **Placeholders:** none.
- **Type consistency:** `domain_renewal_invoices.status` enum matches frontend type union (`pending|paid|failed`; `cancelled` allowed in DB but not yet surfaced in UI — out of scope).
- **Edge cases handled:** linked domains without Stripe customer (skipped with warning); existing invoice for the same period (skipped via the `gte` query); OpenSRS `setAutoRenew` failure on payment failure (logged but doesn't block the DB flip).
- **Out of scope from spec:** customer-facing email notifications (deferred to follow-up), admin retry/cancel UI (deferred), multi-year renewal pre-charge.

---

## Execution

Plan complete and saved to `docs/superpowers/plans/2026-05-08-domain-auto-renewal-billing.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.
