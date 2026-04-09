# OpenSRS Mailbox Provisioning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add email mailbox provisioning as a domain add-on via the OpenSRS Mail API, with admin-configurable pricing tiers and branded webmail.

**Architecture:** New OpenSRS Mail service (JSON-over-HTTP) alongside existing OpenSRS domain service (XML). New `mailbox_pricing` and `domain_mailboxes` database tables. Customer-facing mailbox management as a Card section on the domain detail page. Admin pricing controls as a new tab on the OpenSRS admin page.

**Tech Stack:** Express.js/TypeScript (backend), Next.js 15 App Router/TypeScript (frontend), Supabase (PostgreSQL), OpenSRS Mail API (OMA), Stripe (billing)

---

## File Map

### Backend (`/Users/sethchesky/Documents/GitHub/javelina-backend`)

| File | Action | Responsibility |
|------|--------|---------------|
| `src/config/opensrs-mail.ts` | Create | Mail API config, endpoint URLs, auth |
| `src/services/opensrs-mail.ts` | Create | Mail API client — domain, mailbox, alias, branding CRUD |
| `src/controllers/mailboxController.ts` | Create | Customer-facing mailbox endpoints |
| `src/controllers/mailboxPricingController.ts` | Create | Admin mailbox pricing endpoints |
| `src/routes/mailbox.ts` | Create | Customer mailbox routes |
| `src/routes/admin.ts` | Modify | Add mailbox pricing admin routes |
| `src/routes/index.ts` | Modify | Mount mailbox routes |
| `src/types/mailbox.ts` | Create | Mailbox-related type definitions |
| `src/services/mailbox-billing.ts` | Create | Stripe subscription management for mailbox billing |
| `src/controllers/stripeController.ts` | Modify | Add mailbox webhook handlers |

### Frontend (`/Users/sethchesky/Documents/GitHub/javelina`)

| File | Action | Responsibility |
|------|--------|---------------|
| `supabase/migrations/20260409000000_create_mailbox_tables.sql` | Create | DB migration for mailbox_pricing and domain_mailboxes |
| `types/mailbox.ts` | Create | Frontend mailbox types |
| `lib/api-client.ts` | Modify | Add mailboxApi and adminApi mailbox methods |
| `components/domains/DomainEmailSection.tsx` | Create | Email Card section for domain detail page |
| `app/domains/[id]/page.tsx` | Modify | Add DomainEmailSection between Nameservers and WHOIS |
| `app/admin/opensrs/page.tsx` | Modify | Add "Mailbox Pricing" tab |

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260409000000_create_mailbox_tables.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
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
```

- [ ] **Step 2: Apply the migration locally**

Run: `cd /Users/sethchesky/Documents/GitHub/javelina && npx supabase db push`
Expected: Migration applies successfully, tables created with seed data.

- [ ] **Step 3: Verify tables exist**

Run: `npx supabase db reset --dry-run` or check Supabase dashboard for `mailbox_pricing` and `domain_mailboxes` tables.

- [ ] **Step 4: Commit**

```bash
cd /Users/sethchesky/Documents/GitHub/javelina
git add supabase/migrations/20260409000000_create_mailbox_tables.sql
git commit -m "feat(db): add mailbox_pricing and domain_mailboxes tables"
```

---

## Task 2: Backend — Mailbox Types

**Files:**
- Create: `/Users/sethchesky/Documents/GitHub/javelina-backend/src/types/mailbox.ts`

- [ ] **Step 1: Create mailbox type definitions**

```typescript
export interface MailboxPricingRow {
  id: string;
  tier_name: string;
  storage_gb: number;
  opensrs_cost: number;
  margin_percent: number;
  sale_price_override: number | null;
  mailbox_limit: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DomainMailboxRow {
  id: string;
  domain_id: string;
  tier_id: string;
  opensrs_mail_domain: string | null;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  status: "active" | "suspended" | "disabled";
  created_at: string;
  updated_at: string;
}

export interface OmaMailbox {
  user: string;
  domain: string;
  mailbox_type: "mailbox" | "forward" | "filter";
  suspended: boolean;
  max_storage: number;
  current_usage?: number;
  created?: string;
}

export interface OmaAlias {
  alias: string;
  domain: string;
  target: string;
}

export interface CreateMailboxParams {
  user: string;
  password: string;
}

export interface CreateAliasParams {
  alias: string;
  target: string;
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/sethchesky/Documents/GitHub/javelina-backend
git add src/types/mailbox.ts
git commit -m "feat: add mailbox type definitions"
```

---

## Task 3: Backend — OpenSRS Mail Config

**Files:**
- Create: `/Users/sethchesky/Documents/GitHub/javelina-backend/src/config/opensrs-mail.ts`

Reference pattern: `src/config/opensrs.ts` — same structure with endpoint map, config object, `isConfigured` getter.

- [ ] **Step 1: Create the config file**

```typescript
import axios, { AxiosInstance } from "axios";

const OMA_ENDPOINTS = {
  test: "https://admin.test.hostedemail.com",
  live: "https://admin.a.hostedemail.com",
} as const;

type OmaEnv = keyof typeof OMA_ENDPOINTS;

export const opensrsMailConfig = {
  user: process.env.OPENSRS_MAIL_USER || "",
  password: process.env.OPENSRS_MAIL_PASSWORD || "",
  env: (process.env.OPENSRS_MAIL_ENV || "test") as OmaEnv,
  get apiHost(): string {
    return OMA_ENDPOINTS[this.env];
  },
  get isConfigured(): boolean {
    return !!(this.user && this.password);
  },
};

export function createOmaClient(): AxiosInstance | null {
  if (!opensrsMailConfig.isConfigured) return null;

  return axios.create({
    baseURL: `${opensrsMailConfig.apiHost}/api`,
    headers: {
      "Content-Type": "application/json",
    },
    timeout: 30000,
  });
}

if (process.env.NODE_ENV !== "production") {
  if (opensrsMailConfig.isConfigured) {
    console.log(
      `✅ OpenSRS Mail configured for ${opensrsMailConfig.env} environment (${opensrsMailConfig.apiHost})`
    );
  } else {
    console.warn(
      "⚠️ OpenSRS Mail is not configured. Mailbox features will be disabled."
    );
  }
}
```

- [ ] **Step 2: Add env vars to .env file**

Add to `.env`:
```
OPENSRS_MAIL_USER=your_reseller_username
OPENSRS_MAIL_PASSWORD=your_reseller_password
OPENSRS_MAIL_ENV=test
```

- [ ] **Step 3: Commit**

```bash
cd /Users/sethchesky/Documents/GitHub/javelina-backend
git add src/config/opensrs-mail.ts
git commit -m "feat: add OpenSRS Mail API config"
```

---

## Task 4: Backend — OpenSRS Mail Service

**Files:**
- Create: `/Users/sethchesky/Documents/GitHub/javelina-backend/src/services/opensrs-mail.ts`

This is the core service. The OpenSRS Mail API (OMA) uses JSON-over-HTTP with Basic auth or token auth. Each request includes a `credentials` object.

- [ ] **Step 1: Create the service with auth helper and domain operations**

```typescript
import axios from "axios";
import { opensrsMailConfig } from "../config/opensrs-mail";
import type { OmaMailbox, OmaAlias } from "../types/mailbox";

const API_BASE = () => `${opensrsMailConfig.apiHost}/api`;

interface OmaCredentials {
  user: string;
  password: string;
}

function getCredentials(): OmaCredentials {
  if (!opensrsMailConfig.isConfigured) {
    throw new Error(
      "OpenSRS Mail is not configured. Set OPENSRS_MAIL_USER and OPENSRS_MAIL_PASSWORD."
    );
  }
  return {
    user: opensrsMailConfig.user,
    password: opensrsMailConfig.password,
  };
}

async function omaRequest(
  method: string,
  endpoint: string,
  body?: Record<string, any>
): Promise<any> {
  const credentials = getCredentials();
  const url = `${API_BASE()}/${endpoint}`;

  const payload = {
    credentials,
    ...body,
  };

  const response = await axios({
    method,
    url,
    data: payload,
    headers: { "Content-Type": "application/json" },
    timeout: 30000,
    validateStatus: () => true,
  });

  if (response.status !== 200) {
    throw new Error(
      `OMA API returned HTTP ${response.status}: ${JSON.stringify(response.data)}`
    );
  }

  if (response.data?.success === false || response.data?.error) {
    throw new Error(
      `OMA API error: ${response.data?.error || response.data?.msg || "Unknown error"}`
    );
  }

  return response.data;
}

// =====================================================
// DOMAIN OPERATIONS
// =====================================================

export async function createMailDomain(
  domain: string
): Promise<{ success: boolean }> {
  await omaRequest("POST", "create_domain", { domain });
  return { success: true };
}

export async function deleteMailDomain(
  domain: string
): Promise<{ success: boolean }> {
  await omaRequest("POST", "delete_domain", { domain });
  return { success: true };
}

export async function getMailDomainInfo(
  domain: string
): Promise<Record<string, any>> {
  const result = await omaRequest("GET", `get_domain?domain=${encodeURIComponent(domain)}`);
  return result;
}

// =====================================================
// MAILBOX OPERATIONS
// =====================================================

export async function createMailbox(
  domain: string,
  user: string,
  password: string,
  storageGb: number
): Promise<{ success: boolean }> {
  await omaRequest("POST", "create_mailbox", {
    mailbox: `${user}@${domain}`,
    password,
    max_storage: storageGb * 1024, // Convert GB to MB
  });
  return { success: true };
}

export async function deleteMailbox(
  domain: string,
  user: string
): Promise<{ success: boolean }> {
  await omaRequest("POST", "delete_mailbox", {
    mailbox: `${user}@${domain}`,
  });
  return { success: true };
}

export async function updateMailboxPassword(
  domain: string,
  user: string,
  newPassword: string
): Promise<{ success: boolean }> {
  await omaRequest("POST", "set_mailbox_password", {
    mailbox: `${user}@${domain}`,
    password: newPassword,
  });
  return { success: true };
}

export async function updateMailboxQuota(
  domain: string,
  user: string,
  storageGb: number
): Promise<{ success: boolean }> {
  await omaRequest("POST", "update_mailbox", {
    mailbox: `${user}@${domain}`,
    max_storage: storageGb * 1024,
  });
  return { success: true };
}

export async function listMailboxes(
  domain: string
): Promise<OmaMailbox[]> {
  const result = await omaRequest("GET", `get_domain_mailboxes?domain=${encodeURIComponent(domain)}`);
  const mailboxes = result?.mailboxes || result?.users || [];
  return Array.isArray(mailboxes) ? mailboxes : [];
}

// =====================================================
// ALIAS OPERATIONS
// =====================================================

export async function createAlias(
  domain: string,
  alias: string,
  target: string
): Promise<{ success: boolean }> {
  await omaRequest("POST", "create_mailbox_alias", {
    mailbox: `${target}@${domain}`,
    alias: `${alias}@${domain}`,
  });
  return { success: true };
}

export async function deleteAlias(
  domain: string,
  alias: string
): Promise<{ success: boolean }> {
  await omaRequest("POST", "delete_mailbox_alias", {
    alias: `${alias}@${domain}`,
  });
  return { success: true };
}

export async function listAliases(
  domain: string
): Promise<OmaAlias[]> {
  const result = await omaRequest("GET", `get_domain_aliases?domain=${encodeURIComponent(domain)}`);
  const aliases = result?.aliases || [];
  return Array.isArray(aliases) ? aliases : [];
}

// =====================================================
// BRANDING
// =====================================================

export async function setBranding(
  domain: string,
  options: {
    company_name?: string;
    logo_url?: string;
    primary_color?: string;
    webmail_url?: string;
  }
): Promise<{ success: boolean }> {
  await omaRequest("POST", "set_domain_branding", {
    domain,
    ...options,
  });
  return { success: true };
}

export async function getWebmailUrl(domain: string): Promise<string> {
  // The branded webmail URL follows a standard pattern
  return `https://webmail.${domain}`;
}
```

**Note:** The exact OMA API endpoint names (e.g., `create_domain`, `create_mailbox`, `get_domain_mailboxes`) should be verified against the [OpenSRS Mail API documentation](https://email.opensrs.guide/docs/overview) during implementation. The patterns here follow the documented API structure but endpoint names may vary slightly.

- [ ] **Step 2: Commit**

```bash
cd /Users/sethchesky/Documents/GitHub/javelina-backend
git add src/services/opensrs-mail.ts
git commit -m "feat: add OpenSRS Mail API service"
```

---

## Task 5: Backend — Mailbox Pricing Controller (Admin)

**Files:**
- Create: `/Users/sethchesky/Documents/GitHub/javelina-backend/src/controllers/mailboxPricingController.ts`

Reference pattern: `src/controllers/tldPricingController.ts` — same superuser check, same response pattern.

- [ ] **Step 1: Create the controller**

```typescript
import { Response } from "express";
import { AuthenticatedRequest, ForbiddenError } from "../types";
import { supabaseAdmin } from "../config/supabase";
import { sendSuccess } from "../utils/response";
import type { MailboxPricingRow } from "../types/mailbox";

const checkSuperuser = async (userId: string): Promise<boolean> => {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("superadmin")
    .eq("id", userId)
    .single();
  return data?.superadmin === true;
};

function computeSalePrice(
  opensrsCost: number,
  saleOverride: number | null,
  marginPercent: number
): number {
  if (saleOverride !== null) return saleOverride;
  return Math.round(opensrsCost * (1 + marginPercent / 100) * 100) / 100;
}

/**
 * GET /admin/mailbox-pricing
 * Returns all mailbox pricing tiers with computed sale prices.
 */
export const listMailboxPricing = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const userId = req.user!.id;
  const isSuperuser = await checkSuperuser(userId);
  if (!isSuperuser) {
    throw new ForbiddenError("This endpoint requires superuser access");
  }

  const { data: tiers, error } = await supabaseAdmin
    .from("mailbox_pricing")
    .select("*")
    .order("storage_gb", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch mailbox pricing: ${error.message}`);
  }

  const enriched = (tiers || []).map((tier: MailboxPricingRow) => ({
    ...tier,
    computed_price: computeSalePrice(
      tier.opensrs_cost,
      tier.sale_price_override,
      tier.margin_percent
    ),
    has_sale_override: tier.sale_price_override !== null,
  }));

  sendSuccess(res, { tiers: enriched });
};

/**
 * PUT /admin/mailbox-pricing/:tierId
 * Body: { margin_percent?, sale_price_override?, mailbox_limit?, is_active? }
 */
export const updateMailboxPricing = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const userId = req.user!.id;
  const isSuperuser = await checkSuperuser(userId);
  if (!isSuperuser) {
    throw new ForbiddenError("This endpoint requires superuser access");
  }

  const { tierId } = req.params;
  const { margin_percent, sale_price_override, mailbox_limit, is_active } =
    req.body;

  const updates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (margin_percent !== undefined) updates.margin_percent = margin_percent;
  if (sale_price_override !== undefined)
    updates.sale_price_override = sale_price_override;
  if (mailbox_limit !== undefined) updates.mailbox_limit = mailbox_limit;
  if (is_active !== undefined) updates.is_active = is_active;

  const { data, error } = await supabaseAdmin
    .from("mailbox_pricing")
    .update(updates)
    .eq("id", tierId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update mailbox pricing: ${error.message}`);
  }

  sendSuccess(res, data);
};
```

- [ ] **Step 2: Add admin routes to `src/routes/admin.ts`**

Add at the top with existing imports:
```typescript
import * as mailboxPricing from "../controllers/mailboxPricingController";
```

Add at the bottom before `export default router;`:
```typescript
// Mailbox Pricing
router.get("/mailbox-pricing", asyncHandler(mailboxPricing.listMailboxPricing));
router.put("/mailbox-pricing/:tierId", asyncHandler(mailboxPricing.updateMailboxPricing));
```

- [ ] **Step 3: Commit**

```bash
cd /Users/sethchesky/Documents/GitHub/javelina-backend
git add src/controllers/mailboxPricingController.ts src/routes/admin.ts
git commit -m "feat: add admin mailbox pricing controller and routes"
```

---

## Task 6: Backend — Mailbox Controller (Customer-Facing)

**Files:**
- Create: `/Users/sethchesky/Documents/GitHub/javelina-backend/src/controllers/mailboxController.ts`

Reference pattern: `src/controllers/domainsController.ts` — same import structure, AuthenticatedRequest, sendSuccess/sendError.

- [ ] **Step 1: Create the controller**

```typescript
import { Response } from "express";
import { AuthenticatedRequest } from "../types";
import { supabaseAdmin } from "../config/supabase";
import { sendSuccess, sendError } from "../utils/response";
import { opensrsMailConfig } from "../config/opensrs-mail";
import {
  createMailDomain,
  deleteMailDomain,
  createMailbox as omaCreateMailbox,
  deleteMailbox as omaDeleteMailbox,
  updateMailboxPassword as omaUpdatePassword,
  listMailboxes as omaListMailboxes,
  createAlias as omaCreateAlias,
  deleteAlias as omaDeleteAlias,
  listAliases as omaListAliases,
  setBranding,
  getWebmailUrl,
} from "../services/opensrs-mail";
import type { MailboxPricingRow, DomainMailboxRow } from "../types/mailbox";

// =====================================================
// HELPERS
// =====================================================

async function getDomainForUser(
  domainId: string,
  userId: string
): Promise<{ domain_name: string; id: string } | null> {
  const { data } = await supabaseAdmin
    .from("domains")
    .select("id, domain_name, user_id")
    .eq("id", domainId)
    .single();

  if (!data || data.user_id !== userId) return null;
  return data;
}

async function getDomainMailbox(
  domainId: string
): Promise<DomainMailboxRow | null> {
  const { data } = await supabaseAdmin
    .from("domain_mailboxes")
    .select("*")
    .eq("domain_id", domainId)
    .single();
  return data;
}

function computeSalePrice(tier: MailboxPricingRow): number {
  if (tier.sale_price_override !== null) return tier.sale_price_override;
  return (
    Math.round(tier.opensrs_cost * (1 + tier.margin_percent / 100) * 100) / 100
  );
}

// =====================================================
// PRICING (PUBLIC)
// =====================================================

/**
 * GET /api/mailbox/pricing
 * Returns active mailbox pricing tiers for customers.
 */
export const getMailboxPricing = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const { data: tiers, error } = await supabaseAdmin
    .from("mailbox_pricing")
    .select("*")
    .eq("is_active", true)
    .order("storage_gb", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch mailbox pricing: ${error.message}`);
  }

  const pricing = (tiers || []).map((tier: MailboxPricingRow) => ({
    id: tier.id,
    tier_name: tier.tier_name,
    storage_gb: tier.storage_gb,
    price: computeSalePrice(tier),
    mailbox_limit: tier.mailbox_limit,
  }));

  sendSuccess(res, { tiers: pricing });
};

// =====================================================
// ENABLE / DISABLE EMAIL
// =====================================================

/**
 * POST /api/domains/:domainId/mail/enable
 * Body: { tier_id: string }
 */
export const enableEmail = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  if (!opensrsMailConfig.isConfigured) {
    sendError(res, "Email service is not configured", 503);
    return;
  }

  const userId = req.user!.id;
  const { domainId } = req.params;
  const { tier_id } = req.body;

  const domain = await getDomainForUser(domainId, userId);
  if (!domain) {
    sendError(res, "Domain not found", 404);
    return;
  }

  const existing = await getDomainMailbox(domainId);
  if (existing) {
    sendError(res, "Email is already enabled for this domain", 409);
    return;
  }

  if (!tier_id) {
    sendError(res, "tier_id is required", 400);
    return;
  }

  const { data: tier } = await supabaseAdmin
    .from("mailbox_pricing")
    .select("*")
    .eq("id", tier_id)
    .eq("is_active", true)
    .single();

  if (!tier) {
    sendError(res, "Invalid or inactive pricing tier", 400);
    return;
  }

  // Create domain in OpenSRS Mail
  await createMailDomain(domain.domain_name);

  // Set Javelina branding
  await setBranding(domain.domain_name, {
    company_name: "Javelina",
  });

  // Create local record
  const { data: record, error } = await supabaseAdmin
    .from("domain_mailboxes")
    .insert({
      domain_id: domainId,
      tier_id: tier_id,
      opensrs_mail_domain: domain.domain_name,
      status: "active",
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save email configuration: ${error.message}`);
  }

  sendSuccess(res, {
    ...record,
    tier,
    webmail_url: await getWebmailUrl(domain.domain_name),
  });
};

/**
 * DELETE /api/domains/:domainId/mail/disable
 */
export const disableEmail = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  if (!opensrsMailConfig.isConfigured) {
    sendError(res, "Email service is not configured", 503);
    return;
  }

  const userId = req.user!.id;
  const { domainId } = req.params;

  const domain = await getDomainForUser(domainId, userId);
  if (!domain) {
    sendError(res, "Domain not found", 404);
    return;
  }

  const existing = await getDomainMailbox(domainId);
  if (!existing) {
    sendError(res, "Email is not enabled for this domain", 404);
    return;
  }

  // Delete domain from OpenSRS Mail
  await deleteMailDomain(domain.domain_name);

  // Remove local record
  const { error } = await supabaseAdmin
    .from("domain_mailboxes")
    .delete()
    .eq("domain_id", domainId);

  if (error) {
    throw new Error(`Failed to remove email configuration: ${error.message}`);
  }

  sendSuccess(res, { success: true });
};

// =====================================================
// PLAN MANAGEMENT
// =====================================================

/**
 * PUT /api/domains/:domainId/mail/plan
 * Body: { tier_id: string }
 */
export const changePlan = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const userId = req.user!.id;
  const { domainId } = req.params;
  const { tier_id } = req.body;

  const domain = await getDomainForUser(domainId, userId);
  if (!domain) {
    sendError(res, "Domain not found", 404);
    return;
  }

  const existing = await getDomainMailbox(domainId);
  if (!existing) {
    sendError(res, "Email is not enabled for this domain", 404);
    return;
  }

  if (!tier_id) {
    sendError(res, "tier_id is required", 400);
    return;
  }

  const { data: newTier } = await supabaseAdmin
    .from("mailbox_pricing")
    .select("*")
    .eq("id", tier_id)
    .eq("is_active", true)
    .single();

  if (!newTier) {
    sendError(res, "Invalid or inactive pricing tier", 400);
    return;
  }

  // Update storage quota for all existing mailboxes
  const mailboxes = await omaListMailboxes(domain.domain_name);
  for (const mb of mailboxes) {
    try {
      const { updateMailboxQuota } = await import("../services/opensrs-mail");
      await updateMailboxQuota(domain.domain_name, mb.user, newTier.storage_gb);
    } catch (err: any) {
      console.error(`Failed to update quota for ${mb.user}:`, err.message);
    }
  }

  // Update local record
  const { data, error } = await supabaseAdmin
    .from("domain_mailboxes")
    .update({ tier_id, updated_at: new Date().toISOString() })
    .eq("domain_id", domainId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update plan: ${error.message}`);
  }

  sendSuccess(res, { ...data, tier: newTier });
};

// =====================================================
// MAILBOX CRUD
// =====================================================

/**
 * GET /api/domains/:domainId/mailboxes
 */
export const listDomainMailboxes = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  if (!opensrsMailConfig.isConfigured) {
    sendError(res, "Email service is not configured", 503);
    return;
  }

  const userId = req.user!.id;
  const { domainId } = req.params;

  const domain = await getDomainForUser(domainId, userId);
  if (!domain) {
    sendError(res, "Domain not found", 404);
    return;
  }

  const existing = await getDomainMailbox(domainId);
  if (!existing) {
    sendError(res, "Email is not enabled for this domain", 404);
    return;
  }

  const mailboxes = await omaListMailboxes(domain.domain_name);
  sendSuccess(res, { mailboxes });
};

/**
 * POST /api/domains/:domainId/mailboxes
 * Body: { user: string, password: string }
 */
export const createDomainMailbox = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  if (!opensrsMailConfig.isConfigured) {
    sendError(res, "Email service is not configured", 503);
    return;
  }

  const userId = req.user!.id;
  const { domainId } = req.params;
  const { user, password } = req.body;

  if (!user || !password) {
    sendError(res, "user and password are required", 400);
    return;
  }

  const domain = await getDomainForUser(domainId, userId);
  if (!domain) {
    sendError(res, "Domain not found", 404);
    return;
  }

  const existing = await getDomainMailbox(domainId);
  if (!existing) {
    sendError(res, "Email is not enabled for this domain", 404);
    return;
  }

  // Check mailbox limit
  const { data: tier } = await supabaseAdmin
    .from("mailbox_pricing")
    .select("*")
    .eq("id", existing.tier_id)
    .single();

  if (tier && tier.mailbox_limit > 0) {
    const currentMailboxes = await omaListMailboxes(domain.domain_name);
    if (currentMailboxes.length >= tier.mailbox_limit) {
      sendError(
        res,
        `Mailbox limit reached (${tier.mailbox_limit}). Upgrade your plan for more mailboxes.`,
        403
      );
      return;
    }
  }

  await omaCreateMailbox(
    domain.domain_name,
    user,
    password,
    tier?.storage_gb || 5
  );

  sendSuccess(res, { mailbox: `${user}@${domain.domain_name}` }, "Mailbox created", 201);
};

/**
 * DELETE /api/domains/:domainId/mailboxes/:mailboxUser
 */
export const deleteDomainMailbox = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  if (!opensrsMailConfig.isConfigured) {
    sendError(res, "Email service is not configured", 503);
    return;
  }

  const userId = req.user!.id;
  const { domainId, mailboxUser } = req.params;

  const domain = await getDomainForUser(domainId, userId);
  if (!domain) {
    sendError(res, "Domain not found", 404);
    return;
  }

  await omaDeleteMailbox(domain.domain_name, mailboxUser);
  sendSuccess(res, { success: true });
};

/**
 * PUT /api/domains/:domainId/mailboxes/:mailboxUser/password
 * Body: { password: string }
 */
export const resetMailboxPassword = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  if (!opensrsMailConfig.isConfigured) {
    sendError(res, "Email service is not configured", 503);
    return;
  }

  const userId = req.user!.id;
  const { domainId, mailboxUser } = req.params;
  const { password } = req.body;

  if (!password) {
    sendError(res, "password is required", 400);
    return;
  }

  const domain = await getDomainForUser(domainId, userId);
  if (!domain) {
    sendError(res, "Domain not found", 404);
    return;
  }

  await omaUpdatePassword(domain.domain_name, mailboxUser, password);
  sendSuccess(res, { success: true });
};

// =====================================================
// ALIAS CRUD
// =====================================================

/**
 * GET /api/domains/:domainId/aliases
 */
export const listDomainAliases = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  if (!opensrsMailConfig.isConfigured) {
    sendError(res, "Email service is not configured", 503);
    return;
  }

  const userId = req.user!.id;
  const { domainId } = req.params;

  const domain = await getDomainForUser(domainId, userId);
  if (!domain) {
    sendError(res, "Domain not found", 404);
    return;
  }

  const aliases = await omaListAliases(domain.domain_name);
  sendSuccess(res, { aliases });
};

/**
 * POST /api/domains/:domainId/aliases
 * Body: { alias: string, target: string }
 */
export const createDomainAlias = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  if (!opensrsMailConfig.isConfigured) {
    sendError(res, "Email service is not configured", 503);
    return;
  }

  const userId = req.user!.id;
  const { domainId } = req.params;
  const { alias, target } = req.body;

  if (!alias || !target) {
    sendError(res, "alias and target are required", 400);
    return;
  }

  const domain = await getDomainForUser(domainId, userId);
  if (!domain) {
    sendError(res, "Domain not found", 404);
    return;
  }

  await omaCreateAlias(domain.domain_name, alias, target);
  sendSuccess(res, { alias: `${alias}@${domain.domain_name}` }, "Alias created", 201);
};

/**
 * DELETE /api/domains/:domainId/aliases/:aliasName
 */
export const deleteDomainAlias = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  if (!opensrsMailConfig.isConfigured) {
    sendError(res, "Email service is not configured", 503);
    return;
  }

  const userId = req.user!.id;
  const { domainId, aliasName } = req.params;

  const domain = await getDomainForUser(domainId, userId);
  if (!domain) {
    sendError(res, "Domain not found", 404);
    return;
  }

  await omaDeleteAlias(domain.domain_name, aliasName);
  sendSuccess(res, { success: true });
};

// =====================================================
// EMAIL STATUS
// =====================================================

/**
 * GET /api/domains/:domainId/mail/status
 * Returns the email status for a domain including tier, mailbox count, and webmail URL.
 */
export const getEmailStatus = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const userId = req.user!.id;
  const { domainId } = req.params;

  const domain = await getDomainForUser(domainId, userId);
  if (!domain) {
    sendError(res, "Domain not found", 404);
    return;
  }

  const existing = await getDomainMailbox(domainId);
  if (!existing) {
    sendSuccess(res, { enabled: false });
    return;
  }

  const { data: tier } = await supabaseAdmin
    .from("mailbox_pricing")
    .select("*")
    .eq("id", existing.tier_id)
    .single();

  let mailboxCount = 0;
  if (opensrsMailConfig.isConfigured) {
    try {
      const mailboxes = await omaListMailboxes(domain.domain_name);
      mailboxCount = mailboxes.length;
    } catch {
      // If we can't reach OMA, just use 0
    }
  }

  sendSuccess(res, {
    enabled: true,
    status: existing.status,
    tier: tier
      ? {
          id: tier.id,
          tier_name: tier.tier_name,
          storage_gb: tier.storage_gb,
          price: computeSalePrice(tier),
          mailbox_limit: tier.mailbox_limit,
        }
      : null,
    mailbox_count: mailboxCount,
    webmail_url: await getWebmailUrl(domain.domain_name),
    created_at: existing.created_at,
  });
};
```

- [ ] **Step 2: Commit**

```bash
cd /Users/sethchesky/Documents/GitHub/javelina-backend
git add src/controllers/mailboxController.ts
git commit -m "feat: add customer-facing mailbox controller"
```

---

## Task 7: Backend — Mailbox Routes

**Files:**
- Create: `/Users/sethchesky/Documents/GitHub/javelina-backend/src/routes/mailbox.ts`
- Modify: `/Users/sethchesky/Documents/GitHub/javelina-backend/src/routes/index.ts`

- [ ] **Step 1: Create the routes file**

```typescript
import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { requireEmailVerification } from "../middleware/requireEmailVerification";
import { asyncHandler } from "../middleware/errorHandler";
import {
  getMailboxPricing,
  enableEmail,
  disableEmail,
  changePlan,
  listDomainMailboxes,
  createDomainMailbox,
  deleteDomainMailbox,
  resetMailboxPassword,
  listDomainAliases,
  createDomainAlias,
  deleteDomainAlias,
  getEmailStatus,
} from "../controllers/mailboxController";

const router = Router();

/**
 * GET /api/mailbox/pricing
 * Get active mailbox pricing tiers
 */
router.get("/pricing", authenticate, asyncHandler(getMailboxPricing));

/**
 * GET /api/domains/:domainId/mail/status
 * Get email status for a domain
 */
router.get(
  "/domains/:domainId/mail/status",
  authenticate,
  asyncHandler(getEmailStatus)
);

/**
 * POST /api/domains/:domainId/mail/enable
 * Enable email for a domain
 */
router.post(
  "/domains/:domainId/mail/enable",
  authenticate,
  requireEmailVerification,
  asyncHandler(enableEmail)
);

/**
 * DELETE /api/domains/:domainId/mail/disable
 * Disable email for a domain
 */
router.delete(
  "/domains/:domainId/mail/disable",
  authenticate,
  requireEmailVerification,
  asyncHandler(disableEmail)
);

/**
 * PUT /api/domains/:domainId/mail/plan
 * Change email plan for a domain
 */
router.put(
  "/domains/:domainId/mail/plan",
  authenticate,
  requireEmailVerification,
  asyncHandler(changePlan)
);

/**
 * GET /api/domains/:domainId/mailboxes
 * List mailboxes for a domain
 */
router.get(
  "/domains/:domainId/mailboxes",
  authenticate,
  asyncHandler(listDomainMailboxes)
);

/**
 * POST /api/domains/:domainId/mailboxes
 * Create a mailbox
 */
router.post(
  "/domains/:domainId/mailboxes",
  authenticate,
  requireEmailVerification,
  asyncHandler(createDomainMailbox)
);

/**
 * DELETE /api/domains/:domainId/mailboxes/:mailboxUser
 * Delete a mailbox
 */
router.delete(
  "/domains/:domainId/mailboxes/:mailboxUser",
  authenticate,
  requireEmailVerification,
  asyncHandler(deleteDomainMailbox)
);

/**
 * PUT /api/domains/:domainId/mailboxes/:mailboxUser/password
 * Reset mailbox password
 */
router.put(
  "/domains/:domainId/mailboxes/:mailboxUser/password",
  authenticate,
  requireEmailVerification,
  asyncHandler(resetMailboxPassword)
);

/**
 * GET /api/domains/:domainId/aliases
 * List aliases for a domain
 */
router.get(
  "/domains/:domainId/aliases",
  authenticate,
  asyncHandler(listDomainAliases)
);

/**
 * POST /api/domains/:domainId/aliases
 * Create an alias
 */
router.post(
  "/domains/:domainId/aliases",
  authenticate,
  requireEmailVerification,
  asyncHandler(createDomainAlias)
);

/**
 * DELETE /api/domains/:domainId/aliases/:aliasName
 * Delete an alias
 */
router.delete(
  "/domains/:domainId/aliases/:aliasName",
  authenticate,
  requireEmailVerification,
  asyncHandler(deleteDomainAlias)
);

export default router;
```

- [ ] **Step 2: Mount in routes index**

In `/Users/sethchesky/Documents/GitHub/javelina-backend/src/routes/index.ts`, add the import:

```typescript
import mailboxRoutes from "./mailbox";
```

Add the mount line alongside the other routes:

```typescript
router.use("/mailbox", mailboxRoutes);
```

- [ ] **Step 3: Commit**

```bash
cd /Users/sethchesky/Documents/GitHub/javelina-backend
git add src/routes/mailbox.ts src/routes/index.ts
git commit -m "feat: add mailbox routes and mount in router"
```

---

## Task 8: Frontend — Mailbox Types

**Files:**
- Create: `/Users/sethchesky/Documents/GitHub/javelina/types/mailbox.ts`

- [ ] **Step 1: Create mailbox types**

```typescript
export interface MailboxPricingTier {
  id: string;
  tier_name: string;
  storage_gb: number;
  price: number;
  mailbox_limit: number;
}

export interface MailboxPricingAdminTier {
  id: string;
  tier_name: string;
  storage_gb: number;
  opensrs_cost: number;
  margin_percent: number;
  sale_price_override: number | null;
  mailbox_limit: number;
  is_active: boolean;
  computed_price: number;
  has_sale_override: boolean;
  created_at: string;
  updated_at: string;
}

export interface DomainEmailStatus {
  enabled: boolean;
  status?: "active" | "suspended" | "disabled";
  tier?: MailboxPricingTier | null;
  mailbox_count?: number;
  webmail_url?: string;
  created_at?: string;
}

export interface Mailbox {
  user: string;
  domain: string;
  mailbox_type: "mailbox" | "forward" | "filter";
  suspended: boolean;
  max_storage: number;
  current_usage?: number;
  created?: string;
}

export interface MailAlias {
  alias: string;
  domain: string;
  target: string;
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/sethchesky/Documents/GitHub/javelina
git add types/mailbox.ts
git commit -m "feat: add mailbox type definitions"
```

---

## Task 9: Frontend — API Client Methods

**Files:**
- Modify: `/Users/sethchesky/Documents/GitHub/javelina/lib/api-client.ts`

- [ ] **Step 1: Add mailboxApi methods**

Add the following after the existing `domainsApi` export:

```typescript
export const mailboxApi = {
  // Pricing
  getPricing: (): Promise<{ tiers: MailboxPricingTier[] }> =>
    apiClient.get("/mailbox/pricing"),

  // Email status
  getStatus: (domainId: string): Promise<DomainEmailStatus> =>
    apiClient.get(`/mailbox/domains/${domainId}/mail/status`),

  // Enable/disable
  enable: (domainId: string, tierId: string) =>
    apiClient.post(`/mailbox/domains/${domainId}/mail/enable`, { tier_id: tierId }),

  disable: (domainId: string) =>
    apiClient.delete(`/mailbox/domains/${domainId}/mail/disable`),

  // Plan
  changePlan: (domainId: string, tierId: string) =>
    apiClient.put(`/mailbox/domains/${domainId}/mail/plan`, { tier_id: tierId }),

  // Mailboxes
  listMailboxes: (domainId: string): Promise<{ mailboxes: Mailbox[] }> =>
    apiClient.get(`/mailbox/domains/${domainId}/mailboxes`),

  createMailbox: (domainId: string, user: string, password: string) =>
    apiClient.post(`/mailbox/domains/${domainId}/mailboxes`, { user, password }),

  deleteMailbox: (domainId: string, mailboxUser: string) =>
    apiClient.delete(`/mailbox/domains/${domainId}/mailboxes/${encodeURIComponent(mailboxUser)}`),

  resetPassword: (domainId: string, mailboxUser: string, password: string) =>
    apiClient.put(`/mailbox/domains/${domainId}/mailboxes/${encodeURIComponent(mailboxUser)}/password`, { password }),

  // Aliases
  listAliases: (domainId: string): Promise<{ aliases: MailAlias[] }> =>
    apiClient.get(`/mailbox/domains/${domainId}/aliases`),

  createAlias: (domainId: string, alias: string, target: string) =>
    apiClient.post(`/mailbox/domains/${domainId}/aliases`, { alias, target }),

  deleteAlias: (domainId: string, aliasName: string) =>
    apiClient.delete(`/mailbox/domains/${domainId}/aliases/${encodeURIComponent(aliasName)}`),
};
```

Add the type imports at the top of the file:

```typescript
import type { MailboxPricingTier, DomainEmailStatus, Mailbox, MailAlias } from "@/types/mailbox";
```

- [ ] **Step 2: Add admin mailbox pricing methods**

Add to the existing `adminApi` object:

```typescript
  // Mailbox Pricing
  listMailboxPricing: () => {
    return apiClient.get('/admin/mailbox-pricing');
  },

  updateMailboxPricing: (tierId: string, updates: {
    margin_percent?: number;
    sale_price_override?: number | null;
    mailbox_limit?: number;
    is_active?: boolean;
  }) => {
    return apiClient.put(`/admin/mailbox-pricing/${tierId}`, updates);
  },
```

- [ ] **Step 3: Commit**

```bash
cd /Users/sethchesky/Documents/GitHub/javelina
git add lib/api-client.ts
git commit -m "feat: add mailbox and admin pricing API methods"
```

---

## Task 10: Frontend — Domain Email Section Component

**Files:**
- Create: `/Users/sethchesky/Documents/GitHub/javelina/components/domains/DomainEmailSection.tsx`

This is the main customer-facing UI. It follows the Card pattern from the domain detail page.

- [ ] **Step 1: Create the component**

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { ConfirmationModal } from '@/components/modals/ConfirmationModal';
import { mailboxApi } from '@/lib/api-client';
import { useToastStore } from '@/lib/toast-store';
import { extractErrorMessage } from '@/lib/utils';
import type {
  MailboxPricingTier,
  DomainEmailStatus,
  Mailbox,
  MailAlias,
} from '@/types/mailbox';
import { Mail, Plus, Trash2, Key, ExternalLink } from 'lucide-react';

interface DomainEmailSectionProps {
  domainId: string;
  domainName: string;
}

export function DomainEmailSection({ domainId, domainName }: DomainEmailSectionProps) {
  const { addToast } = useToastStore();

  // State
  const [loading, setLoading] = useState(true);
  const [emailStatus, setEmailStatus] = useState<DomainEmailStatus | null>(null);
  const [pricingTiers, setPricingTiers] = useState<MailboxPricingTier[]>([]);
  const [selectedTier, setSelectedTier] = useState<string>('');
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [aliases, setAliases] = useState<MailAlias[]>([]);

  // Form state
  const [showAddMailbox, setShowAddMailbox] = useState(false);
  const [newMailboxUser, setNewMailboxUser] = useState('');
  const [newMailboxPassword, setNewMailboxPassword] = useState('');
  const [creatingMailbox, setCreatingMailbox] = useState(false);

  const [showAddAlias, setShowAddAlias] = useState(false);
  const [newAliasName, setNewAliasName] = useState('');
  const [newAliasTarget, setNewAliasTarget] = useState('');
  const [creatingAlias, setCreatingAlias] = useState(false);

  const [showResetPassword, setShowResetPassword] = useState<string | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);

  const [enablingEmail, setEnablingEmail] = useState(false);
  const [changingPlan, setChangingPlan] = useState(false);
  const [showChangePlan, setShowChangePlan] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [disablingEmail, setDisablingEmail] = useState(false);
  const [deletingMailbox, setDeletingMailbox] = useState<string | null>(null);
  const [deletingAlias, setDeletingAlias] = useState<string | null>(null);

  // Fetch email status and pricing
  const fetchStatus = useCallback(async () => {
    try {
      const status = await mailboxApi.getStatus(domainId);
      setEmailStatus(status);

      if (status.enabled) {
        const [mbData, aliasData] = await Promise.all([
          mailboxApi.listMailboxes(domainId),
          mailboxApi.listAliases(domainId),
        ]);
        setMailboxes(mbData.mailboxes);
        setAliases(aliasData.aliases);
      }
    } catch (err: any) {
      console.error('Failed to fetch email status:', err);
    } finally {
      setLoading(false);
    }
  }, [domainId]);

  const fetchPricing = useCallback(async () => {
    try {
      const data = await mailboxApi.getPricing();
      setPricingTiers(data.tiers);
      if (data.tiers.length > 0) {
        setSelectedTier(data.tiers[0].id);
      }
    } catch (err: any) {
      console.error('Failed to fetch pricing:', err);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchPricing();
  }, [fetchStatus, fetchPricing]);

  // Handlers
  const handleEnableEmail = async () => {
    if (!selectedTier) return;
    setEnablingEmail(true);
    try {
      await mailboxApi.enable(domainId, selectedTier);
      addToast('success', 'Email enabled successfully.');
      await fetchStatus();
    } catch (err: any) {
      addToast('error', extractErrorMessage(err, 'Failed to enable email'));
    } finally {
      setEnablingEmail(false);
    }
  };

  const handleDisableEmail = async () => {
    setDisablingEmail(true);
    try {
      await mailboxApi.disable(domainId);
      addToast('success', 'Email disabled.');
      setMailboxes([]);
      setAliases([]);
      await fetchStatus();
    } catch (err: any) {
      addToast('error', extractErrorMessage(err, 'Failed to disable email'));
    } finally {
      setDisablingEmail(false);
      setShowDisableConfirm(false);
    }
  };

  const handleChangePlan = async (tierId: string) => {
    setChangingPlan(true);
    try {
      await mailboxApi.changePlan(domainId, tierId);
      addToast('success', 'Plan updated successfully.');
      setShowChangePlan(false);
      await fetchStatus();
    } catch (err: any) {
      addToast('error', extractErrorMessage(err, 'Failed to change plan'));
    } finally {
      setChangingPlan(false);
    }
  };

  const handleCreateMailbox = async () => {
    if (!newMailboxUser || !newMailboxPassword) return;
    setCreatingMailbox(true);
    try {
      await mailboxApi.createMailbox(domainId, newMailboxUser, newMailboxPassword);
      addToast('success', `Mailbox ${newMailboxUser}@${domainName} created.`);
      setNewMailboxUser('');
      setNewMailboxPassword('');
      setShowAddMailbox(false);
      const data = await mailboxApi.listMailboxes(domainId);
      setMailboxes(data.mailboxes);
    } catch (err: any) {
      addToast('error', extractErrorMessage(err, 'Failed to create mailbox'));
    } finally {
      setCreatingMailbox(false);
    }
  };

  const handleDeleteMailbox = async (user: string) => {
    setDeletingMailbox(user);
    try {
      await mailboxApi.deleteMailbox(domainId, user);
      addToast('success', `Mailbox ${user}@${domainName} deleted.`);
      setMailboxes((prev) => prev.filter((m) => m.user !== user));
    } catch (err: any) {
      addToast('error', extractErrorMessage(err, 'Failed to delete mailbox'));
    } finally {
      setDeletingMailbox(null);
    }
  };

  const handleResetPassword = async () => {
    if (!showResetPassword || !resetPasswordValue) return;
    setResettingPassword(true);
    try {
      await mailboxApi.resetPassword(domainId, showResetPassword, resetPasswordValue);
      addToast('success', 'Password updated.');
      setShowResetPassword(null);
      setResetPasswordValue('');
    } catch (err: any) {
      addToast('error', extractErrorMessage(err, 'Failed to reset password'));
    } finally {
      setResettingPassword(false);
    }
  };

  const handleCreateAlias = async () => {
    if (!newAliasName || !newAliasTarget) return;
    setCreatingAlias(true);
    try {
      await mailboxApi.createAlias(domainId, newAliasName, newAliasTarget);
      addToast('success', `Alias ${newAliasName}@${domainName} created.`);
      setNewAliasName('');
      setNewAliasTarget('');
      setShowAddAlias(false);
      const data = await mailboxApi.listAliases(domainId);
      setAliases(data.aliases);
    } catch (err: any) {
      addToast('error', extractErrorMessage(err, 'Failed to create alias'));
    } finally {
      setCreatingAlias(false);
    }
  };

  const handleDeleteAlias = async (alias: string) => {
    setDeletingAlias(alias);
    try {
      await mailboxApi.deleteAlias(domainId, alias);
      addToast('success', `Alias ${alias}@${domainName} deleted.`);
      setAliases((prev) => prev.filter((a) => a.alias !== alias));
    } catch (err: any) {
      addToast('error', extractErrorMessage(err, 'Failed to delete alias'));
    } finally {
      setDeletingAlias(null);
    }
  };

  // Loading skeleton
  if (loading) {
    return (
      <Card title="Email" icon={<Mail className="w-5 h-5 text-orange" />}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
        </div>
      </Card>
    );
  }

  // ─── NOT ENABLED ─────────────────────────────────
  if (!emailStatus?.enabled) {
    return (
      <Card
        title="Email"
        description="Add email mailboxes to your domain"
        icon={<Mail className="w-5 h-5 text-orange" />}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Choose a plan to enable email for <span className="font-medium text-gray-700 dark:text-gray-200">{domainName}</span>.
            Each mailbox is billed monthly.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {pricingTiers.map((tier) => (
              <button
                key={tier.id}
                onClick={() => setSelectedTier(tier.id)}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  selectedTier === tier.id
                    ? 'border-orange bg-orange/5'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="font-semibold text-sm text-gray-900 dark:text-white">
                  {tier.tier_name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {tier.storage_gb}GB storage
                </div>
                <div className="text-lg font-bold text-orange mt-2">
                  ${tier.price.toFixed(2)}
                  <span className="text-xs font-normal text-gray-500">/mo per mailbox</span>
                </div>
                {tier.mailbox_limit > 0 && (
                  <div className="text-xs text-gray-400 mt-1">
                    Up to {tier.mailbox_limit} mailboxes
                  </div>
                )}
              </button>
            ))}
          </div>

          <Button
            onClick={handleEnableEmail}
            disabled={!selectedTier || enablingEmail}
          >
            {enablingEmail ? 'Enabling...' : 'Enable Email'}
          </Button>
        </div>
      </Card>
    );
  }

  // ─── ENABLED ─────────────────────────────────────
  return (
    <Card
      title="Email"
      icon={<Mail className="w-5 h-5 text-orange" />}
      action={
        emailStatus.webmail_url ? (
          <a
            href={emailStatus.webmail_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-orange hover:text-orange-dark flex items-center gap-1"
          >
            Open Webmail <ExternalLink className="w-3.5 h-3.5" />
          </a>
        ) : null
      }
    >
      <div className="space-y-6">
        {/* Current Plan */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-orange/10 text-orange text-sm font-medium rounded-full">
              {emailStatus.tier?.tier_name}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {emailStatus.tier?.storage_gb}GB &middot; ${emailStatus.tier?.price.toFixed(2)}/mo per mailbox
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowChangePlan(!showChangePlan)}
          >
            Change Plan
          </Button>
        </div>

        {/* Change Plan Panel */}
        {showChangePlan && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            {pricingTiers.map((tier) => (
              <button
                key={tier.id}
                onClick={() => handleChangePlan(tier.id)}
                disabled={changingPlan || tier.id === emailStatus.tier?.id}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  tier.id === emailStatus.tier?.id
                    ? 'border-orange bg-orange/5 opacity-50'
                    : 'border-gray-200 dark:border-gray-700 hover:border-orange'
                }`}
              >
                <div className="font-semibold text-sm">{tier.tier_name}</div>
                <div className="text-xs text-gray-500 mt-1">{tier.storage_gb}GB</div>
                <div className="text-sm font-bold text-orange mt-1">
                  ${tier.price.toFixed(2)}/mo
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Mailboxes */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Mailboxes ({mailboxes.length})
            </h4>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddMailbox(!showAddMailbox)}
            >
              <Plus className="w-4 h-4 mr-1" /> Add Mailbox
            </Button>
          </div>

          {/* Add Mailbox Form */}
          {showAddMailbox && (
            <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Input
                    label="Email address"
                    value={newMailboxUser}
                    onChange={(e) => setNewMailboxUser(e.target.value)}
                    placeholder="user"
                  />
                </div>
                <span className="pb-2 text-sm text-gray-500">@{domainName}</span>
              </div>
              <Input
                label="Password"
                type="password"
                value={newMailboxPassword}
                onChange={(e) => setNewMailboxPassword(e.target.value)}
                placeholder="Set a password"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleCreateMailbox}
                  disabled={!newMailboxUser || !newMailboxPassword || creatingMailbox}
                >
                  {creatingMailbox ? 'Creating...' : 'Create Mailbox'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowAddMailbox(false);
                    setNewMailboxUser('');
                    setNewMailboxPassword('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Mailbox Table */}
          {mailboxes.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Email Address
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {mailboxes.map((mb) => (
                    <tr key={mb.user} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                        {mb.user}@{mb.domain}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            mb.suspended
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          }`}
                        >
                          {mb.suspended ? 'Suspended' : 'Active'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setShowResetPassword(mb.user);
                              setResetPasswordValue('');
                            }}
                            className="text-gray-500 hover:text-orange"
                            title="Reset password"
                          >
                            <Key className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteMailbox(mb.user)}
                            disabled={deletingMailbox === mb.user}
                            className="text-gray-500 hover:text-red-500"
                            title="Delete mailbox"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">No mailboxes yet. Add one above.</p>
          )}

          {/* Reset Password Modal */}
          {showResetPassword && (
            <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
              <p className="text-sm font-medium">
                Reset password for{' '}
                <span className="text-orange">{showResetPassword}@{domainName}</span>
              </p>
              <Input
                type="password"
                value={resetPasswordValue}
                onChange={(e) => setResetPasswordValue(e.target.value)}
                placeholder="New password"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleResetPassword}
                  disabled={!resetPasswordValue || resettingPassword}
                >
                  {resettingPassword ? 'Updating...' : 'Update Password'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowResetPassword(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Aliases */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Aliases ({aliases.length})
            </h4>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddAlias(!showAddAlias)}
            >
              <Plus className="w-4 h-4 mr-1" /> Add Alias
            </Button>
          </div>

          {/* Add Alias Form */}
          {showAddAlias && (
            <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Input
                    label="Alias"
                    value={newAliasName}
                    onChange={(e) => setNewAliasName(e.target.value)}
                    placeholder="alias"
                  />
                </div>
                <span className="pb-2 text-sm text-gray-500">@{domainName}</span>
              </div>
              <Input
                label="Forwards to"
                value={newAliasTarget}
                onChange={(e) => setNewAliasTarget(e.target.value)}
                placeholder="existing-mailbox"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleCreateAlias}
                  disabled={!newAliasName || !newAliasTarget || creatingAlias}
                >
                  {creatingAlias ? 'Creating...' : 'Create Alias'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowAddAlias(false);
                    setNewAliasName('');
                    setNewAliasTarget('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Alias List */}
          {aliases.length > 0 ? (
            <div className="space-y-2">
              {aliases.map((a) => (
                <div
                  key={a.alias}
                  className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div className="text-sm">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {a.alias}@{a.domain}
                    </span>
                    <span className="text-gray-400 mx-2">&rarr;</span>
                    <span className="text-gray-500">{a.target}@{a.domain}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteAlias(a.alias)}
                    disabled={deletingAlias === a.alias}
                    className="text-gray-500 hover:text-red-500"
                    title="Delete alias"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">No aliases yet.</p>
          )}
        </div>

        {/* Disable Email */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-red-700 dark:text-red-400">
              Disable Email
            </h4>
            <p className="text-xs text-red-600 dark:text-red-400 mt-1 mb-3">
              This will permanently delete all mailboxes, aliases, and email data for this domain.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="border-red-300 text-red-600 hover:bg-red-50"
              onClick={() => setShowDisableConfirm(true)}
            >
              Disable Email
            </Button>
          </div>
        </div>
      </div>

      {/* Disable Confirmation Modal */}
      {showDisableConfirm && (
        <ConfirmationModal
          title="Disable Email"
          message={`Are you sure you want to disable email for ${domainName}? This will permanently delete all mailboxes and aliases.`}
          confirmLabel={disablingEmail ? 'Disabling...' : 'Disable Email'}
          onConfirm={handleDisableEmail}
          onCancel={() => setShowDisableConfirm(false)}
          destructive
        />
      )}
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/sethchesky/Documents/GitHub/javelina
git add components/domains/DomainEmailSection.tsx
git commit -m "feat: add DomainEmailSection component"
```

---

## Task 11: Frontend — Add Email Section to Domain Detail Page

**Files:**
- Modify: `/Users/sethchesky/Documents/GitHub/javelina/app/domains/[id]/page.tsx`

- [ ] **Step 1: Add import**

At the top of the file with other imports, add:

```typescript
import { DomainEmailSection } from '@/components/domains/DomainEmailSection';
```

- [ ] **Step 2: Insert the component between Nameservers and WHOIS**

Find the closing `</Card>` of the Nameservers section (around line 541) and add before the WHOIS Contact Information Card:

```typescript
{/* Email */}
{domain && domain.status === 'active' && (
  <DomainEmailSection
    domainId={domain.id}
    domainName={domain.domain_name}
  />
)}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/sethchesky/Documents/GitHub/javelina
git add app/domains/[id]/page.tsx
git commit -m "feat: add email section to domain detail page"
```

---

## Task 12: Frontend — Admin Mailbox Pricing Tab

**Files:**
- Modify: `/Users/sethchesky/Documents/GitHub/javelina/app/admin/opensrs/page.tsx`

- [ ] **Step 1: Add the new tab to the TABS array**

Change:
```typescript
const TABS = [
  { id: 'transaction-log', label: 'Transaction Log' },
  { id: 'tld-pricing', label: 'TLD Pricing' },
] as const;
type TabId = typeof TABS[number]['id'];
```

To:
```typescript
const TABS = [
  { id: 'transaction-log', label: 'Transaction Log' },
  { id: 'tld-pricing', label: 'TLD Pricing' },
  { id: 'mailbox-pricing', label: 'Mailbox Pricing' },
] as const;
type TabId = typeof TABS[number]['id'];
```

- [ ] **Step 2: Add mailbox pricing state**

Add with the other state declarations:

```typescript
const [mailboxTiers, setMailboxTiers] = useState<MailboxPricingAdminTier[]>([]);
const [mailboxLoading, setMailboxLoading] = useState(false);
const [editingTier, setEditingTier] = useState<string | null>(null);
const [tierEdits, setTierEdits] = useState<{
  margin_percent: number;
  sale_price_override: string;
  mailbox_limit: number;
  is_active: boolean;
}>({ margin_percent: 50, sale_price_override: '', mailbox_limit: 0, is_active: true });
```

Add the import at the top:
```typescript
import type { MailboxPricingAdminTier } from '@/types/mailbox';
```

- [ ] **Step 3: Add fetch and handler functions**

```typescript
const fetchMailboxPricing = useCallback(async () => {
  setMailboxLoading(true);
  try {
    const data = await adminApi.listMailboxPricing();
    setMailboxTiers(data.tiers);
  } catch (err: any) {
    addToast('error', extractErrorMessage(err, 'Failed to fetch mailbox pricing'));
  } finally {
    setMailboxLoading(false);
  }
}, [addToast]);

useEffect(() => {
  if (activeTab === 'mailbox-pricing' && mailboxTiers.length === 0 && !mailboxLoading) {
    fetchMailboxPricing();
  }
}, [activeTab, mailboxTiers.length, mailboxLoading, fetchMailboxPricing]);

const handleStartTierEdit = (tier: MailboxPricingAdminTier) => {
  setEditingTier(tier.id);
  setTierEdits({
    margin_percent: tier.margin_percent,
    sale_price_override: tier.sale_price_override !== null ? tier.sale_price_override.toString() : '',
    mailbox_limit: tier.mailbox_limit,
    is_active: tier.is_active,
  });
};

const handleSaveTierEdit = async () => {
  if (!editingTier) return;
  try {
    await adminApi.updateMailboxPricing(editingTier, {
      margin_percent: tierEdits.margin_percent,
      sale_price_override: tierEdits.sale_price_override ? parseFloat(tierEdits.sale_price_override) : null,
      mailbox_limit: tierEdits.mailbox_limit,
      is_active: tierEdits.is_active,
    });
    addToast('success', 'Mailbox pricing updated.');
    setEditingTier(null);
    await fetchMailboxPricing();
  } catch (err: any) {
    addToast('error', extractErrorMessage(err, 'Failed to update pricing'));
  }
};

const handleToggleTierActive = async (tierId: string, currentActive: boolean) => {
  try {
    await adminApi.updateMailboxPricing(tierId, { is_active: !currentActive });
    addToast('success', `Tier ${currentActive ? 'deactivated' : 'activated'}.`);
    await fetchMailboxPricing();
  } catch (err: any) {
    addToast('error', extractErrorMessage(err, 'Failed to toggle tier'));
  }
};
```

- [ ] **Step 4: Add the tab content in the render section**

After the `{activeTab === 'tld-pricing' && (...)}` block, add:

```typescript
{activeTab === 'mailbox-pricing' && (
  <div className="space-y-4">
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tier</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Storage</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">OpenSRS Cost</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Margin %</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sale Price</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Mailbox Limit</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Active</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {mailboxLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              mailboxTiers.map((tier) => (
                <tr key={tier.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-orange-dark dark:text-white">{tier.tier_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{tier.storage_gb}GB</td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 font-mono">${tier.opensrs_cost.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{tier.margin_percent}%</td>
                  <td className="px-4 py-3 text-sm font-mono">
                    <span className={tier.has_sale_override ? 'text-orange font-medium' : 'text-gray-700 dark:text-gray-300'}>
                      ${tier.computed_price.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    {tier.mailbox_limit === 0 ? 'Unlimited' : tier.mailbox_limit}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <button
                      onClick={() => handleToggleTierActive(tier.id, tier.is_active)}
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        tier.is_active
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}
                    >
                      {tier.is_active ? 'Yes' : 'No'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {editingTier === tier.id ? (
                      <div className="flex gap-1">
                        <button onClick={handleSaveTierEdit} className="text-green-600 text-xs font-medium hover:underline">Save</button>
                        <button onClick={() => setEditingTier(null)} className="text-gray-500 text-xs font-medium hover:underline">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => handleStartTierEdit(tier)} className="text-orange text-xs font-medium hover:underline">Edit</button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>

    {/* Edit Panel */}
    {editingTier && (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Margin %</label>
            <input
              type="number"
              value={tierEdits.margin_percent}
              onChange={(e) => setTierEdits({ ...tierEdits, margin_percent: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Sale Price Override ($)</label>
            <input
              type="number"
              step="0.01"
              value={tierEdits.sale_price_override}
              onChange={(e) => setTierEdits({ ...tierEdits, sale_price_override: e.target.value })}
              placeholder="Auto from margin"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Mailbox Limit (0 = unlimited)</label>
            <input
              type="number"
              value={tierEdits.mailbox_limit}
              onChange={(e) => setTierEdits({ ...tierEdits, mailbox_limit: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="flex items-end gap-2">
            <Button size="sm" onClick={handleSaveTierEdit}>Save</Button>
            <Button variant="outline" size="sm" onClick={() => setEditingTier(null)}>Cancel</Button>
          </div>
        </div>
      </div>
    )}
  </div>
)}
```

- [ ] **Step 5: Commit**

```bash
cd /Users/sethchesky/Documents/GitHub/javelina
git add app/admin/opensrs/page.tsx
git commit -m "feat: add mailbox pricing tab to admin OpenSRS page"
```

---

## Task 13: Backend — Mailbox Billing Service

**Files:**
- Create: `/Users/sethchesky/Documents/GitHub/javelina-backend/src/services/mailbox-billing.ts`

This service handles creating and managing Stripe subscriptions for mailbox billing. Each domain with email enabled gets its own Stripe Subscription with quantity = number of mailboxes. The subscription uses a per-unit monthly price that corresponds to the selected tier.

- [ ] **Step 1: Create the billing service**

```typescript
import Stripe from "stripe";
import { stripe } from "../config/stripe";
import { supabaseAdmin } from "../config/supabase";
import { env } from "../config/env";
import type { MailboxPricingRow, DomainMailboxRow } from "../types/mailbox";

// Stripe product/price IDs are created on first use and cached in app_settings
const MAILBOX_PRODUCT_NAME = "Javelina Email Mailbox";

function computeSalePrice(tier: MailboxPricingRow): number {
  if (tier.sale_price_override !== null) return tier.sale_price_override;
  return Math.round(tier.opensrs_cost * (1 + tier.margin_percent / 100) * 100) / 100;
}

/**
 * Get or create a Stripe Price for a mailbox tier.
 * Prices are stored in the mailbox_pricing table as stripe_price_id.
 * If no price exists, one is created dynamically.
 */
async function getOrCreateStripePrice(tier: MailboxPricingRow): Promise<string> {
  // Check if we already have a stripe_price_id for this tier at this price
  const { data: existing } = await supabaseAdmin
    .from("mailbox_pricing")
    .select("stripe_price_id, stripe_product_id")
    .eq("id", tier.id)
    .single();

  const salePrice = computeSalePrice(tier);
  const unitAmount = Math.round(salePrice * 100); // cents

  // If price exists, verify it matches current sale price
  if (existing?.stripe_price_id) {
    try {
      const stripePrice = await stripe!.prices.retrieve(existing.stripe_price_id);
      if (stripePrice.unit_amount === unitAmount && stripePrice.active) {
        return existing.stripe_price_id;
      }
      // Price changed — deactivate old price and create new one
      await stripe!.prices.update(existing.stripe_price_id, { active: false });
    } catch {
      // Price not found in Stripe, create new one
    }
  }

  // Get or create the Stripe Product
  let productId = existing?.stripe_product_id;
  if (!productId) {
    const product = await stripe!.products.create({
      name: `${MAILBOX_PRODUCT_NAME} - ${tier.tier_name}`,
      description: `${tier.storage_gb}GB email mailbox`,
      metadata: { tier_id: tier.id, tier_name: tier.tier_name },
    });
    productId = product.id;
  }

  // Create the recurring price
  const price = await stripe!.prices.create({
    product: productId,
    unit_amount: unitAmount,
    currency: "usd",
    recurring: { interval: "month" },
    metadata: { tier_id: tier.id, tier_name: tier.tier_name },
  });

  // Save price and product IDs back to the tier row
  await supabaseAdmin
    .from("mailbox_pricing")
    .update({
      stripe_price_id: price.id,
      stripe_product_id: productId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", tier.id);

  return price.id;
}

/**
 * Get or create a Stripe Customer for the user.
 * Reuses the customer from the user's org subscription if available.
 */
async function getOrCreateCustomer(
  userId: string,
  email: string
): Promise<string> {
  // Check if user's org already has a Stripe customer
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("email, name")
    .eq("id", userId)
    .single();

  const userEmail = email || profile?.email;

  // Check for existing customer by email
  const customers = await stripe!.customers.list({
    email: userEmail,
    limit: 1,
  });

  if (customers.data.length > 0) {
    return customers.data[0].id;
  }

  // Create new customer
  const customer = await stripe!.customers.create({
    email: userEmail,
    name: profile?.name || undefined,
    metadata: { user_id: userId },
  });

  return customer.id;
}

/**
 * Create a Stripe Subscription for a domain's email service.
 * Called when email is enabled on a domain.
 */
export async function createMailboxSubscription(
  userId: string,
  userEmail: string,
  domainId: string,
  domainName: string,
  tier: MailboxPricingRow
): Promise<{ subscriptionId: string; customerId: string }> {
  if (!stripe) {
    throw new Error("Stripe is not configured");
  }

  const priceId = await getOrCreateStripePrice(tier);
  const customerId = await getOrCreateCustomer(userId, userEmail);

  // Create subscription with quantity 0 (no mailboxes yet)
  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId, quantity: 0 }],
    payment_behavior: "default_incomplete",
    payment_settings: { save_default_payment_method: "on_subscription" },
    metadata: {
      type: "mailbox",
      domain_id: domainId,
      domain_name: domainName,
      tier_id: tier.id,
      tier_name: tier.tier_name,
      user_id: userId,
    },
  });

  return {
    subscriptionId: subscription.id,
    customerId,
  };
}

/**
 * Update the quantity on a mailbox subscription.
 * Called when mailboxes are added or removed.
 */
export async function updateMailboxSubscriptionQuantity(
  stripeSubscriptionId: string,
  newQuantity: number
): Promise<void> {
  if (!stripe) {
    throw new Error("Stripe is not configured");
  }

  const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
  const itemId = subscription.items.data[0]?.id;

  if (!itemId) {
    throw new Error("No subscription item found");
  }

  await stripe.subscriptions.update(stripeSubscriptionId, {
    items: [{ id: itemId, quantity: newQuantity }],
    proration_behavior: "create_prorations",
  });
}

/**
 * Update the price on a mailbox subscription when the tier changes.
 * Called when a customer changes their email plan.
 */
export async function updateMailboxSubscriptionTier(
  stripeSubscriptionId: string,
  newTier: MailboxPricingRow,
  currentQuantity: number
): Promise<void> {
  if (!stripe) {
    throw new Error("Stripe is not configured");
  }

  const newPriceId = await getOrCreateStripePrice(newTier);
  const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
  const itemId = subscription.items.data[0]?.id;

  if (!itemId) {
    throw new Error("No subscription item found");
  }

  await stripe.subscriptions.update(stripeSubscriptionId, {
    items: [{ id: itemId, price: newPriceId, quantity: currentQuantity }],
    proration_behavior: "create_prorations",
  });
}

/**
 * Cancel the mailbox subscription.
 * Called when email is disabled on a domain.
 */
export async function cancelMailboxSubscription(
  stripeSubscriptionId: string
): Promise<void> {
  if (!stripe) {
    throw new Error("Stripe is not configured");
  }

  await stripe.subscriptions.cancel(stripeSubscriptionId);
}
```

- [ ] **Step 2: Update the mailbox_pricing migration to include Stripe columns**

In the migration file `supabase/migrations/20260409000000_create_mailbox_tables.sql`, the `mailbox_pricing` table needs two additional columns:

```sql
-- Add after mailbox_limit column:
  stripe_product_id text,
  stripe_price_id text,
```

- [ ] **Step 3: Update the MailboxPricingRow type to include Stripe fields**

In `/Users/sethchesky/Documents/GitHub/javelina-backend/src/types/mailbox.ts`, add to `MailboxPricingRow`:

```typescript
export interface MailboxPricingRow {
  id: string;
  tier_name: string;
  storage_gb: number;
  opensrs_cost: number;
  margin_percent: number;
  sale_price_override: number | null;
  mailbox_limit: number;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

- [ ] **Step 4: Commit**

```bash
cd /Users/sethchesky/Documents/GitHub/javelina-backend
git add src/services/mailbox-billing.ts src/types/mailbox.ts
git commit -m "feat: add mailbox Stripe billing service"
```

---

## Task 14: Backend — Integrate Billing into Mailbox Controller

**Files:**
- Modify: `/Users/sethchesky/Documents/GitHub/javelina-backend/src/controllers/mailboxController.ts`
- Modify: `/Users/sethchesky/Documents/GitHub/javelina-backend/src/controllers/stripeController.ts`

The existing `enableEmail`, `disableEmail`, `createDomainMailbox`, `deleteDomainMailbox`, and `changePlan` handlers need to create/update/cancel Stripe subscriptions.

- [ ] **Step 1: Update enableEmail to create a Stripe subscription**

Add import at top of `mailboxController.ts`:
```typescript
import {
  createMailboxSubscription,
  updateMailboxSubscriptionQuantity,
  updateMailboxSubscriptionTier,
  cancelMailboxSubscription,
} from "../services/mailbox-billing";
```

In the `enableEmail` handler, after `await setBranding(...)` and before the `domain_mailboxes` insert, add:

```typescript
  // Create Stripe subscription for mailbox billing
  let stripeSubscriptionId: string | null = null;
  let stripeCustomerId: string | null = null;
  try {
    const billing = await createMailboxSubscription(
      userId,
      req.user!.email || "",
      domainId,
      domain.domain_name,
      tier
    );
    stripeSubscriptionId = billing.subscriptionId;
    stripeCustomerId = billing.customerId;
  } catch (err: any) {
    console.error("Failed to create billing subscription:", err.message);
    // Continue without billing — admin can reconcile later
  }
```

Update the `domain_mailboxes` insert to include Stripe fields:

```typescript
  const { data: record, error } = await supabaseAdmin
    .from("domain_mailboxes")
    .insert({
      domain_id: domainId,
      tier_id: tier_id,
      opensrs_mail_domain: domain.domain_name,
      stripe_subscription_id: stripeSubscriptionId,
      stripe_customer_id: stripeCustomerId,
      status: "active",
    })
    .select()
    .single();
```

- [ ] **Step 2: Update disableEmail to cancel the Stripe subscription**

In the `disableEmail` handler, after verifying the domain exists and before deleting from `domain_mailboxes`, add:

```typescript
  // Cancel Stripe subscription
  if (existing.stripe_subscription_id) {
    try {
      await cancelMailboxSubscription(existing.stripe_subscription_id);
    } catch (err: any) {
      console.error("Failed to cancel billing subscription:", err.message);
    }
  }
```

- [ ] **Step 3: Update createDomainMailbox to increment subscription quantity**

In the `createDomainMailbox` handler, after the successful `omaCreateMailbox` call, add:

```typescript
  // Update Stripe subscription quantity
  if (existing.stripe_subscription_id) {
    try {
      const updatedMailboxes = await omaListMailboxes(domain.domain_name);
      await updateMailboxSubscriptionQuantity(
        existing.stripe_subscription_id,
        updatedMailboxes.length
      );
    } catch (err: any) {
      console.error("Failed to update billing quantity:", err.message);
    }
  }
```

- [ ] **Step 4: Update deleteDomainMailbox to decrement subscription quantity**

In the `deleteDomainMailbox` handler, after the successful `omaDeleteMailbox` call, add:

```typescript
  // Update Stripe subscription quantity
  const domainMailbox = await getDomainMailbox(domainId);
  if (domainMailbox?.stripe_subscription_id) {
    try {
      const remainingMailboxes = await omaListMailboxes(domain.domain_name);
      await updateMailboxSubscriptionQuantity(
        domainMailbox.stripe_subscription_id,
        remainingMailboxes.length
      );
    } catch (err: any) {
      console.error("Failed to update billing quantity:", err.message);
    }
  }
```

- [ ] **Step 5: Update changePlan to update subscription price**

In the `changePlan` handler, after updating mailbox quotas and before the `domain_mailboxes` update, add:

```typescript
  // Update Stripe subscription to new tier price
  if (existing.stripe_subscription_id) {
    try {
      await updateMailboxSubscriptionTier(
        existing.stripe_subscription_id,
        newTier,
        mailboxes.length
      );
    } catch (err: any) {
      console.error("Failed to update billing tier:", err.message);
    }
  }
```

- [ ] **Step 6: Add mailbox webhook handler to stripeController.ts**

In `/Users/sethchesky/Documents/GitHub/javelina-backend/src/controllers/stripeController.ts`, add a handler for mailbox subscription events. In the main webhook switch statement, add:

```typescript
// Inside the existing switch(event.type) block, in the
// customer.subscription.deleted handler:

// Check if this is a mailbox subscription
if (subscription.metadata?.type === "mailbox") {
  const domainId = subscription.metadata.domain_id;
  if (domainId) {
    await supabaseAdmin
      .from("domain_mailboxes")
      .update({
        status: "suspended",
        updated_at: new Date().toISOString(),
      })
      .eq("domain_id", domainId)
      .eq("stripe_subscription_id", subscription.id);
    console.log(`Mailbox subscription canceled for domain ${domainId}`);
  }
  return;
}
```

And in the `invoice.payment_failed` handler:

```typescript
// Check if this is a mailbox subscription payment failure
const failedSubscriptionId = invoice.subscription;
if (failedSubscriptionId) {
  const { data: mailboxRecord } = await supabaseAdmin
    .from("domain_mailboxes")
    .select("*")
    .eq("stripe_subscription_id", failedSubscriptionId)
    .single();

  if (mailboxRecord) {
    await supabaseAdmin
      .from("domain_mailboxes")
      .update({
        status: "suspended",
        updated_at: new Date().toISOString(),
      })
      .eq("id", mailboxRecord.id);
    console.log(`Mailbox subscription payment failed for domain ${mailboxRecord.domain_id}`);
    return;
  }
}
```

- [ ] **Step 7: Commit**

```bash
cd /Users/sethchesky/Documents/GitHub/javelina-backend
git add src/controllers/mailboxController.ts src/controllers/stripeController.ts
git commit -m "feat: integrate Stripe billing into mailbox controller and webhooks"
```

---

## Task 15: Verify and Test

- [ ] **Step 1: Start the backend and check for compilation errors**

```bash
cd /Users/sethchesky/Documents/GitHub/javelina-backend
npm run dev
```

Expected: Server starts without TypeScript errors. Console shows OpenSRS Mail config message.

- [ ] **Step 2: Start the frontend and check for compilation errors**

```bash
cd /Users/sethchesky/Documents/GitHub/javelina
npm run dev
```

Expected: Next.js compiles without errors.

- [ ] **Step 3: Test admin mailbox pricing endpoint**

```bash
curl -s http://localhost:3001/api/admin/mailbox-pricing \
  -H "Authorization: Bearer <your-token>" | jq
```

Expected: Returns 4 tiers with computed prices.

- [ ] **Step 4: Verify the domain detail page loads the Email section**

Navigate to a domain detail page in the browser. Verify the Email Card appears between Nameservers and WHOIS with tier selection cards.

- [ ] **Step 5: Verify admin Mailbox Pricing tab**

Navigate to `/admin/opensrs` and click the "Mailbox Pricing" tab. Verify the pricing table renders with all 4 tiers.

- [ ] **Step 6: Test enable email flow against Horizon**

Set `OPENSRS_MAIL_ENV=test` and test enabling email on a domain. Verify the OpenSRS Mail API calls succeed against the sandbox.

- [ ] **Step 7: Verify Stripe subscription creation**

After enabling email on a domain, check the Stripe dashboard (or use `stripe subscriptions list --limit 1`) to verify a subscription was created with:
- quantity: 0
- metadata.type: "mailbox"
- metadata.domain_name: the domain name
- recurring price matching the selected tier

- [ ] **Step 8: Test mailbox creation updates billing quantity**

Create a mailbox via the UI or API. Verify the Stripe subscription quantity incremented to 1. Create a second mailbox and verify quantity is 2. Delete one and verify quantity decrements back to 1.

- [ ] **Step 9: Test plan change updates billing price**

Change the email plan tier for a domain. Verify in Stripe that the subscription item's price ID updated to match the new tier, and proration was created.

- [ ] **Step 10: Test disable email cancels subscription**

Disable email on a domain. Verify the Stripe subscription status is "canceled" in the dashboard.

- [ ] **Step 11: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: address issues found during testing"
```
