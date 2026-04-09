# TLD Pricing Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move TLD pricing from hardcoded source code into the database with admin controls for global margin, per-TLD overrides, and wholesale price seeding from OpenSRS API.

**Architecture:** New `tld_pricing` and `app_settings` tables in Supabase. Backend admin endpoints for CRUD operations. Seed endpoint calls OpenSRS `get_price` API for all 87 TLDs. `getDomainPrice()` modified to read from DB. Frontend adds "TLD Pricing" tab to the existing OpenSRS Config page.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, Express, Supabase, OpenSRS XML API

**Spec:** `docs/superpowers/specs/2026-04-02-tld-pricing-controls-design.md`

---

## File Structure

### Backend (`javelina-backend`)
- **Create:** `src/controllers/tldPricingController.ts` — All TLD pricing endpoint handlers
- **Modify:** `src/routes/admin.ts` — Add TLD pricing routes
- **Modify:** `src/services/opensrs.ts` — Add `getWholesalePrice()` function, modify `getDomainPrice()` to read from DB

### Frontend (`javelina`)
- **Modify:** `app/admin/opensrs/page.tsx` — Add "TLD Pricing" tab with table and controls
- **Modify:** `lib/api-client.ts` — Add admin TLD pricing API methods

### Database
- **Migration:** Create `tld_pricing` and `app_settings` tables via Supabase MCP

---

## Task 1: Database — Create `tld_pricing` and `app_settings` tables

- [ ] **Step 1: Create the migration via Supabase MCP**

Use `mcp__plugin_supabase_supabase__apply_migration` with project_id `ipfsrbxjgewhdcvonrbo` to create the tables:

```sql
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

-- RLS policies: service role only (backend uses supabaseAdmin which bypasses RLS)
-- No public access policies needed since all access goes through the backend API

COMMENT ON TABLE public.tld_pricing IS 'TLD wholesale and sale pricing with margin controls';
COMMENT ON TABLE public.app_settings IS 'Application-wide settings key-value store';
```

Migration name: `create_tld_pricing_and_app_settings`

- [ ] **Step 2: Verify tables exist**

Use `mcp__plugin_supabase_supabase__list_tables` to confirm both tables appear in the public schema.

- [ ] **Step 3: Commit backend (no files changed — migration is in Supabase)**

No git commit needed for this step — the migration lives in Supabase.

---

## Task 2: Backend — Add `getWholesalePrice()` to OpenSRS service

**Files:**
- Modify: `javelina-backend/src/services/opensrs.ts`

- [ ] **Step 1: Add the `getWholesalePrice` function**

In `/Users/sethchesky/Documents/GitHub/javelina-backend/src/services/opensrs.ts`, add this function after the existing `getDomainPrice()` function (after line ~754):

```typescript
/**
 * Fetch wholesale price from OpenSRS API for a specific domain/TLD.
 * Uses the GET_PRICE action to get the reseller's actual cost.
 */
export async function getWholesalePrice(
  tld: string,
  regType: "new" | "renewal" | "transfer" = "new"
): Promise<number | null> {
  try {
    // Use a dummy domain name with the TLD for price lookup
    const domain = `example${tld}`;
    const result = await sendRequest("GET_PRICE", "DOMAIN", {
      domain,
      period: 1,
      reg_type: regType,
    });

    if (result.is_success && result.attributes.price) {
      return parseFloat(result.attributes.price);
    }
    return null;
  } catch (error) {
    console.error(`[OpenSRS] Failed to get wholesale price for ${tld} (${regType}):`, error);
    return null;
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/sethchesky/Documents/GitHub/javelina-backend
git add src/services/opensrs.ts
git commit -m "feat: add getWholesalePrice() to OpenSRS service"
```

---

## Task 3: Backend — Create TLD pricing controller

**Files:**
- Create: `javelina-backend/src/controllers/tldPricingController.ts`

- [ ] **Step 1: Create the controller file**

Create `/Users/sethchesky/Documents/GitHub/javelina-backend/src/controllers/tldPricingController.ts`:

```typescript
import { Response } from "express";
import { AuthenticatedRequest } from "../types";
import { supabaseAdmin } from "../config/supabase";
import { sendSuccess } from "../utils/response";
import { ForbiddenError } from "../types";
import { DEFAULT_TLD_PRICING, getWholesalePrice } from "../services/opensrs";

const checkSuperuser = async (userId: string): Promise<boolean> => {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("superadmin")
    .eq("id", userId)
    .single();
  return data?.superadmin === true;
};

interface TldPricingRow {
  tld: string;
  wholesale_registration: number;
  wholesale_renewal: number;
  wholesale_transfer: number;
  sale_registration: number | null;
  sale_renewal: number | null;
  sale_transfer: number | null;
  margin_override: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

function computeSalePrice(
  wholesale: number,
  saleOverride: number | null,
  marginOverride: number | null,
  globalMargin: number
): number {
  if (saleOverride !== null) return saleOverride;
  const margin = marginOverride !== null ? marginOverride : globalMargin;
  return Math.round(wholesale * (1 + margin / 100) * 100) / 100;
}

/**
 * GET /admin/tld-pricing
 * Returns all TLDs with wholesale, effective margin, and computed sale prices.
 */
export const listTldPricing = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const userId = req.user!.id;
  const isSuperuser = await checkSuperuser(userId);
  if (!isSuperuser) {
    throw new ForbiddenError("This endpoint requires superuser access");
  }

  const { data: tlds, error } = await supabaseAdmin
    .from("tld_pricing")
    .select("*")
    .order("tld", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch TLD pricing: ${error.message}`);
  }

  // Get global margin
  const { data: setting } = await supabaseAdmin
    .from("app_settings")
    .select("value")
    .eq("key", "global_tld_margin")
    .single();

  const globalMargin = setting?.value ?? 30;

  const enriched = (tlds || []).map((tld: TldPricingRow) => ({
    ...tld,
    global_margin: globalMargin,
    effective_margin: tld.margin_override !== null ? tld.margin_override : globalMargin,
    computed_registration: computeSalePrice(tld.wholesale_registration, tld.sale_registration, tld.margin_override, globalMargin),
    computed_renewal: computeSalePrice(tld.wholesale_renewal, tld.sale_renewal, tld.margin_override, globalMargin),
    computed_transfer: computeSalePrice(tld.wholesale_transfer, tld.sale_transfer, tld.margin_override, globalMargin),
    has_margin_override: tld.margin_override !== null,
    has_sale_override_registration: tld.sale_registration !== null,
    has_sale_override_renewal: tld.sale_renewal !== null,
    has_sale_override_transfer: tld.sale_transfer !== null,
  }));

  sendSuccess(res, { tlds: enriched, global_margin: globalMargin });
};

/**
 * GET /admin/tld-pricing/global-margin
 */
export const getGlobalMargin = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const userId = req.user!.id;
  const isSuperuser = await checkSuperuser(userId);
  if (!isSuperuser) {
    throw new ForbiddenError("This endpoint requires superuser access");
  }

  const { data, error } = await supabaseAdmin
    .from("app_settings")
    .select("value")
    .eq("key", "global_tld_margin")
    .single();

  if (error) {
    throw new Error(`Failed to fetch global margin: ${error.message}`);
  }

  sendSuccess(res, { global_margin: data?.value ?? 30 });
};

/**
 * PUT /admin/tld-pricing/global-margin
 * Body: { margin: number }
 */
export const updateGlobalMargin = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const userId = req.user!.id;
  const isSuperuser = await checkSuperuser(userId);
  if (!isSuperuser) {
    throw new ForbiddenError("This endpoint requires superuser access");
  }

  const { margin } = req.body;
  if (typeof margin !== "number" || margin < 0 || margin > 1000) {
    throw new Error("Margin must be a number between 0 and 1000");
  }

  const { error } = await supabaseAdmin
    .from("app_settings")
    .upsert({ key: "global_tld_margin", value: margin, updated_at: new Date().toISOString() });

  if (error) {
    throw new Error(`Failed to update global margin: ${error.message}`);
  }

  sendSuccess(res, { global_margin: margin });
};

/**
 * PUT /admin/tld-pricing/:tld
 * Body: { margin_override?, sale_registration?, sale_renewal?, sale_transfer?, is_active? }
 */
export const updateTldPricing = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const userId = req.user!.id;
  const isSuperuser = await checkSuperuser(userId);
  if (!isSuperuser) {
    throw new ForbiddenError("This endpoint requires superuser access");
  }

  const { tld } = req.params;
  const { margin_override, sale_registration, sale_renewal, sale_transfer, is_active } = req.body;

  const updates: Record<string, any> = { updated_at: new Date().toISOString() };

  if (margin_override !== undefined) updates.margin_override = margin_override;
  if (sale_registration !== undefined) updates.sale_registration = sale_registration;
  if (sale_renewal !== undefined) updates.sale_renewal = sale_renewal;
  if (sale_transfer !== undefined) updates.sale_transfer = sale_transfer;
  if (is_active !== undefined) updates.is_active = is_active;

  const { data, error } = await supabaseAdmin
    .from("tld_pricing")
    .update(updates)
    .eq("tld", tld)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update TLD pricing for ${tld}: ${error.message}`);
  }

  sendSuccess(res, data);
};

/**
 * POST /admin/tld-pricing/seed
 * Fetches wholesale prices from OpenSRS API for all TLDs and seeds the database.
 * Sets current hardcoded prices as sale overrides so customer prices don't change.
 */
export const seedTldPricing = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const userId = req.user!.id;
  const isSuperuser = await checkSuperuser(userId);
  if (!isSuperuser) {
    throw new ForbiddenError("This endpoint requires superuser access");
  }

  const tlds = Object.keys(DEFAULT_TLD_PRICING);
  const results: { tld: string; success: boolean; error?: string }[] = [];

  for (const tld of tlds) {
    try {
      // Fetch wholesale prices from OpenSRS (with small delay to avoid rate limiting)
      const [wholesaleReg, wholesaleRenew, wholesaleTransfer] = await Promise.all([
        getWholesalePrice(tld, "new"),
        getWholesalePrice(tld, "renewal"),
        getWholesalePrice(tld, "transfer"),
      ]);

      // Get current hardcoded sale prices
      const currentPricing = DEFAULT_TLD_PRICING[tld];

      const row = {
        tld,
        wholesale_registration: wholesaleReg ?? 0,
        wholesale_renewal: wholesaleRenew ?? 0,
        wholesale_transfer: wholesaleTransfer ?? 0,
        // Set current hardcoded prices as sale overrides so nothing changes for customers
        sale_registration: currentPricing.registration,
        sale_renewal: currentPricing.renewal,
        sale_transfer: currentPricing.transfer,
        is_active: true,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabaseAdmin
        .from("tld_pricing")
        .upsert(row, { onConflict: "tld" });

      if (error) {
        results.push({ tld, success: false, error: error.message });
      } else {
        results.push({ tld, success: true });
      }
    } catch (err: any) {
      results.push({ tld, success: false, error: err.message });
    }
  }

  const succeeded = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  sendSuccess(res, {
    total: tlds.length,
    succeeded,
    failed,
    failures: results.filter((r) => !r.success),
  });
};
```

- [ ] **Step 2: Commit**

```bash
cd /Users/sethchesky/Documents/GitHub/javelina-backend
git add src/controllers/tldPricingController.ts
git commit -m "feat(admin): add TLD pricing controller with CRUD and seed endpoints"
```

---

## Task 4: Backend — Add TLD pricing routes

**Files:**
- Modify: `javelina-backend/src/routes/admin.ts`

- [ ] **Step 1: Add the routes**

In `/Users/sethchesky/Documents/GitHub/javelina-backend/src/routes/admin.ts`, add a namespace import for the new controller and the routes. The file already uses `import * as controller from "../controllers/adminController"`. Add a second import:

```typescript
import * as tldPricing from "../controllers/tldPricingController";
```

Then add the routes after the existing admin routes:

```typescript
// TLD Pricing
router.get("/tld-pricing", asyncHandler(tldPricing.listTldPricing));
router.get("/tld-pricing/global-margin", asyncHandler(tldPricing.getGlobalMargin));
router.put("/tld-pricing/global-margin", asyncHandler(tldPricing.updateGlobalMargin));
router.put("/tld-pricing/:tld", asyncHandler(tldPricing.updateTldPricing));
router.post("/tld-pricing/seed", asyncHandler(tldPricing.seedTldPricing));
```

**IMPORTANT:** The `/tld-pricing/global-margin` and `/tld-pricing/seed` routes MUST be declared BEFORE `/tld-pricing/:tld` to avoid the `:tld` param catching `global-margin` and `seed` as TLD values.

- [ ] **Step 2: Commit**

```bash
cd /Users/sethchesky/Documents/GitHub/javelina-backend
git add src/routes/admin.ts
git commit -m "feat(admin): add TLD pricing routes"
```

---

## Task 5: Backend — Modify `getDomainPrice()` to read from DB

**Files:**
- Modify: `javelina-backend/src/services/opensrs.ts`

- [ ] **Step 1: Update `getDomainPrice()` to query the database**

In `/Users/sethchesky/Documents/GitHub/javelina-backend/src/services/opensrs.ts`, add the supabaseAdmin import at the top of the file (if not already imported):

```typescript
import { supabaseAdmin } from "../config/supabase";
```

Then replace the existing `getDomainPrice()` function (lines ~740-754) with:

```typescript
/**
 * Get the sale price for a domain based on its TLD.
 * Reads from database if available, falls back to DEFAULT_TLD_PRICING.
 */
export async function getDomainPrice(
  domain: string,
  type: "registration" | "renewal" | "transfer" = "registration"
): Promise<{ price: number; currency: string; tld: string } | null> {
  const tld = extractTld(domain);

  // Try database first
  try {
    const { data: tldRow } = await supabaseAdmin
      .from("tld_pricing")
      .select("*")
      .eq("tld", tld)
      .eq("is_active", true)
      .single();

    if (tldRow) {
      // Get global margin
      const { data: setting } = await supabaseAdmin
        .from("app_settings")
        .select("value")
        .eq("key", "global_tld_margin")
        .single();

      const globalMargin = setting?.value ?? 30;

      const wholesaleKey = `wholesale_${type}` as keyof typeof tldRow;
      const saleKey = `sale_${type}` as keyof typeof tldRow;
      const wholesale = Number(tldRow[wholesaleKey]) || 0;
      const saleOverride = tldRow[saleKey] !== null ? Number(tldRow[saleKey]) : null;
      const marginOverride = tldRow.margin_override !== null ? Number(tldRow.margin_override) : null;

      let price: number;
      if (saleOverride !== null) {
        price = saleOverride;
      } else {
        const margin = marginOverride !== null ? marginOverride : globalMargin;
        price = Math.round(wholesale * (1 + margin / 100) * 100) / 100;
      }

      return { price, currency: "USD", tld };
    }
  } catch (error) {
    // DB query failed — fall through to hardcoded fallback
    console.error(`[Pricing] DB lookup failed for ${tld}, using fallback:`, error);
  }

  // Fallback to hardcoded pricing
  const pricing = DEFAULT_TLD_PRICING[tld];
  if (!pricing) return null;

  return {
    price: pricing[type],
    currency: "USD",
    tld,
  };
}
```

**Note:** This changes `getDomainPrice` from a sync function to async. All callers already `await` their results or are in async contexts, but verify the callers handle this correctly.

- [ ] **Step 2: Update callers of `getDomainPrice` to await the result**

Search the codebase for all usages of `getDomainPrice`. In `domainsController.ts`, the function is already called in async contexts. Update each call site to use `await`:

In `/Users/sethchesky/Documents/GitHub/javelina-backend/src/controllers/domainsController.ts`, find every occurrence of `getDomainPrice(` and ensure it's preceded by `await`. For example:

```typescript
// Before:
const pricing = getDomainPrice(domain, priceType);

// After:
const pricing = await getDomainPrice(domain, priceType);
```

Also update the search results mapping in `domainsController.ts` where `getDomainPrice` is called inside a `.map()`:

```typescript
// Before (in searchDomains):
const lookupWithPricing = results.lookup.map((item) => ({
  ...item,
  pricing: getDomainPrice(item.domain),
}));

// After:
const lookupWithPricing = await Promise.all(
  results.lookup.map(async (item) => ({
    ...item,
    pricing: await getDomainPrice(item.domain),
  }))
);
```

Apply the same pattern to `suggestionsWithPricing` if it exists.

- [ ] **Step 3: Commit**

```bash
cd /Users/sethchesky/Documents/GitHub/javelina-backend
git add src/services/opensrs.ts src/controllers/domainsController.ts
git commit -m "feat: getDomainPrice() now reads from tld_pricing table with fallback"
```

---

## Task 6: Frontend — Add TLD pricing API methods

**Files:**
- Modify: `javelina/lib/api-client.ts`

- [ ] **Step 1: Add the API methods to adminApi**

In `/Users/sethchesky/Documents/GitHub/javelina/lib/api-client.ts`, find the `adminApi` object and add these methods after `listDomains`:

```typescript
  /**
   * List all TLD pricing (admin only)
   */
  listTldPricing: () => {
    return apiClient.get('/admin/tld-pricing');
  },

  /**
   * Get global TLD margin
   */
  getGlobalMargin: () => {
    return apiClient.get('/admin/tld-pricing/global-margin');
  },

  /**
   * Update global TLD margin
   */
  updateGlobalMargin: (margin: number) => {
    return apiClient.put('/admin/tld-pricing/global-margin', { margin });
  },

  /**
   * Update a single TLD's pricing
   */
  updateTldPricing: (tld: string, updates: {
    margin_override?: number | null;
    sale_registration?: number | null;
    sale_renewal?: number | null;
    sale_transfer?: number | null;
    is_active?: boolean;
  }) => {
    return apiClient.put(`/admin/tld-pricing/${encodeURIComponent(tld)}`, updates);
  },

  /**
   * Seed TLD pricing from OpenSRS wholesale prices
   */
  seedTldPricing: () => {
    return apiClient.post('/admin/tld-pricing/seed');
  },
```

- [ ] **Step 2: Commit**

```bash
cd /Users/sethchesky/Documents/GitHub/javelina
git add lib/api-client.ts
git commit -m "feat(admin): add TLD pricing API methods"
```

---

## Task 7: Frontend — Add "TLD Pricing" tab to OpenSRS Config page

**Files:**
- Modify: `javelina/app/admin/opensrs/page.tsx`

- [ ] **Step 1: Add the TLD Pricing tab and full implementation**

This is the largest task. Modify `/Users/sethchesky/Documents/GitHub/javelina/app/admin/opensrs/page.tsx`:

**1. Add the Dropdown import** (already imported from Task earlier — verify it's there):
```typescript
import Dropdown from '@/components/ui/Dropdown';
```

**2. Add the tab to the TABS array:**
```typescript
const TABS = [
  { id: 'transaction-log', label: 'Transaction Log' },
  { id: 'tld-pricing', label: 'TLD Pricing' },
] as const;
```

**3. Add new interfaces after the existing ones:**
```typescript
interface TldPricing {
  tld: string;
  wholesale_registration: number;
  wholesale_renewal: number;
  wholesale_transfer: number;
  sale_registration: number | null;
  sale_renewal: number | null;
  sale_transfer: number | null;
  margin_override: number | null;
  is_active: boolean;
  global_margin: number;
  effective_margin: number;
  computed_registration: number;
  computed_renewal: number;
  computed_transfer: number;
  has_margin_override: boolean;
  has_sale_override_registration: boolean;
  has_sale_override_renewal: boolean;
  has_sale_override_transfer: boolean;
}
```

**4. Add state variables** inside `AdminOpenSRSPage()`, after the existing state:
```typescript
  // TLD Pricing state
  const [tldPricingData, setTldPricingData] = useState<TldPricing[]>([]);
  const [tldLoading, setTldLoading] = useState(false);
  const [globalMargin, setGlobalMargin] = useState<number>(30);
  const [editingMargin, setEditingMargin] = useState<string>('30');
  const [tldSearch, setTldSearch] = useState('');
  const [tldPage, setTldPage] = useState(1);
  const [editingTld, setEditingTld] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    margin_override: string;
    sale_registration: string;
    sale_renewal: string;
    sale_transfer: string;
  }>({ margin_override: '', sale_registration: '', sale_renewal: '', sale_transfer: '' });
  const [seeding, setSeeding] = useState(false);
  const tldPageSize = 10;
```

**5. Add fetch function** after the existing `fetchDomains`:
```typescript
  const fetchTldPricing = useCallback(async () => {
    setTldLoading(true);
    try {
      const data = await adminApi.listTldPricing();
      setTldPricingData(data.tlds || []);
      setGlobalMargin(data.global_margin ?? 30);
      setEditingMargin(String(data.global_margin ?? 30));
    } catch (error: any) {
      addToast('error', error.message || 'Failed to fetch TLD pricing');
    } finally {
      setTldLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (activeTab === 'tld-pricing' && tldPricingData.length === 0 && !tldLoading) {
      fetchTldPricing();
    }
  }, [activeTab, tldPricingData.length, tldLoading, fetchTldPricing]);
```

**6. Add handler functions:**
```typescript
  const handleSaveGlobalMargin = async () => {
    const margin = parseFloat(editingMargin);
    if (isNaN(margin) || margin < 0 || margin > 1000) {
      addToast('error', 'Margin must be between 0 and 1000');
      return;
    }
    try {
      await adminApi.updateGlobalMargin(margin);
      addToast('success', `Global margin updated to ${margin}%`);
      await fetchTldPricing();
    } catch (error: any) {
      addToast('error', error.message || 'Failed to update global margin');
    }
  };

  const handleStartEdit = (tld: TldPricing) => {
    setEditingTld(tld.tld);
    setEditForm({
      margin_override: tld.margin_override !== null ? String(tld.margin_override) : '',
      sale_registration: tld.sale_registration !== null ? String(tld.sale_registration) : '',
      sale_renewal: tld.sale_renewal !== null ? String(tld.sale_renewal) : '',
      sale_transfer: tld.sale_transfer !== null ? String(tld.sale_transfer) : '',
    });
  };

  const handleSaveTld = async () => {
    if (!editingTld) return;
    try {
      const updates: Record<string, any> = {};
      updates.margin_override = editForm.margin_override ? parseFloat(editForm.margin_override) : null;
      updates.sale_registration = editForm.sale_registration ? parseFloat(editForm.sale_registration) : null;
      updates.sale_renewal = editForm.sale_renewal ? parseFloat(editForm.sale_renewal) : null;
      updates.sale_transfer = editForm.sale_transfer ? parseFloat(editForm.sale_transfer) : null;
      await adminApi.updateTldPricing(editingTld, updates);
      addToast('success', `Pricing updated for ${editingTld}`);
      setEditingTld(null);
      await fetchTldPricing();
    } catch (error: any) {
      addToast('error', error.message || 'Failed to update TLD pricing');
    }
  };

  const handleSeedPricing = async () => {
    setSeeding(true);
    try {
      const result = await adminApi.seedTldPricing();
      addToast('success', `Seeded ${result.succeeded}/${result.total} TLDs. ${result.failed} failed.`);
      await fetchTldPricing();
    } catch (error: any) {
      addToast('error', error.message || 'Failed to seed pricing');
    } finally {
      setSeeding(false);
    }
  };

  const handleToggleActive = async (tld: string, isActive: boolean) => {
    try {
      await adminApi.updateTldPricing(tld, { is_active: !isActive });
      await fetchTldPricing();
    } catch (error: any) {
      addToast('error', error.message || 'Failed to toggle TLD');
    }
  };
```

**7. Add filtered/paginated TLD data:**
```typescript
  const filteredTlds = useMemo(() => {
    if (!tldSearch.trim()) return tldPricingData;
    const q = tldSearch.toLowerCase();
    return tldPricingData.filter((t) => t.tld.toLowerCase().includes(q));
  }, [tldPricingData, tldSearch]);

  const tldTotalPages = Math.ceil(filteredTlds.length / tldPageSize);
  const paginatedTlds = useMemo(() => {
    const start = (tldPage - 1) * tldPageSize;
    return filteredTlds.slice(start, start + tldPageSize);
  }, [filteredTlds, tldPage]);

  useEffect(() => {
    setTldPage(1);
  }, [tldSearch]);
```

**8. Add the tab content** after the Transaction Log tab's closing `)}`:

```tsx
          {/* TLD Pricing Tab */}
          {activeTab === 'tld-pricing' && (
            <div className="space-y-4">
              {/* Global Margin Control */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div>
                    <h3 className="text-sm font-medium text-orange-dark dark:text-white">Global Margin</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Applied to all TLDs without a per-TLD override</p>
                  </div>
                  <div className="flex items-center gap-2 sm:ml-auto">
                    <input
                      type="number"
                      value={editingMargin}
                      onChange={(e) => setEditingMargin(e.target.value)}
                      className="w-24 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-orange-dark dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange focus:border-transparent"
                      min="0"
                      max="1000"
                      step="0.1"
                    />
                    <span className="text-sm text-gray-500 dark:text-gray-400">%</span>
                    <button
                      onClick={handleSaveGlobalMargin}
                      className="px-3 py-1.5 text-sm font-medium rounded-lg bg-orange text-white hover:bg-orange/90 transition-colors"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>

              {/* Controls Row */}
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search TLDs..."
                    value={tldSearch}
                    onChange={(e) => setTldSearch(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-orange-dark dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange focus:border-transparent"
                  />
                </div>
                <button
                  onClick={handleSeedPricing}
                  disabled={seeding}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-orange-dark dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {seeding ? 'Fetching Prices...' : 'Refresh Wholesale Prices'}
                </button>
              </div>

              {/* Results count */}
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Showing {Math.min((tldPage - 1) * tldPageSize + 1, filteredTlds.length)}–{Math.min(tldPage * tldPageSize, filteredTlds.length)} of {filteredTlds.length} TLD{filteredTlds.length !== 1 ? 's' : ''}
              </p>

              {/* TLD Table */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">TLD</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Wholesale (Reg / Renew / Xfer)</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Margin %</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sale Price (Reg / Renew / Xfer)</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Active</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {tldLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <tr key={i}>
                            {Array.from({ length: 6 }).map((_, j) => (
                              <td key={j} className="px-4 py-3">
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : paginatedTlds.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                            {tldPricingData.length === 0 ? 'No TLD pricing data. Click "Refresh Wholesale Prices" to seed.' : 'No TLDs match your search.'}
                          </td>
                        </tr>
                      ) : (
                        paginatedTlds.map((tld) => (
                          <tr key={tld.tld} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                            <td className="px-4 py-3 text-sm font-medium text-orange-dark dark:text-white">
                              {tld.tld}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 font-mono">
                              ${tld.wholesale_registration.toFixed(2)} / ${tld.wholesale_renewal.toFixed(2)} / ${tld.wholesale_transfer.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span className={tld.has_margin_override ? 'text-orange font-medium' : 'text-gray-700 dark:text-gray-300'}>
                                {tld.effective_margin}%
                              </span>
                              {tld.has_margin_override && (
                                <span className="ml-1 text-xs text-orange">(override)</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm font-mono">
                              <span className={tld.has_sale_override_registration ? 'text-orange font-medium' : 'text-gray-700 dark:text-gray-300'}>
                                ${tld.computed_registration.toFixed(2)}
                              </span>
                              {' / '}
                              <span className={tld.has_sale_override_renewal ? 'text-orange font-medium' : 'text-gray-700 dark:text-gray-300'}>
                                ${tld.computed_renewal.toFixed(2)}
                              </span>
                              {' / '}
                              <span className={tld.has_sale_override_transfer ? 'text-orange font-medium' : 'text-gray-700 dark:text-gray-300'}>
                                ${tld.computed_transfer.toFixed(2)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <button
                                onClick={() => handleToggleActive(tld.tld, tld.is_active)}
                                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                  tld.is_active
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                }`}
                              >
                                {tld.is_active ? 'Yes' : 'No'}
                              </button>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {editingTld === tld.tld ? (
                                <div className="flex gap-1">
                                  <button onClick={handleSaveTld} className="text-green-600 hover:text-green-800 text-xs font-medium">Save</button>
                                  <button onClick={() => setEditingTld(null)} className="text-gray-500 hover:text-gray-700 text-xs font-medium">Cancel</button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleStartEdit(tld)}
                                  className="text-orange hover:text-orange/80 text-xs font-medium"
                                >
                                  Edit
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Edit Panel - appears below table when editing */}
              {editingTld && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-orange/50 p-4">
                  <h3 className="text-sm font-medium text-orange-dark dark:text-white mb-3">Editing {editingTld}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Margin Override (%)</label>
                      <input
                        type="number"
                        value={editForm.margin_override}
                        onChange={(e) => setEditForm({ ...editForm, margin_override: e.target.value })}
                        placeholder={`Global: ${globalMargin}%`}
                        className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-orange-dark dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange focus:border-transparent"
                        step="0.1"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Sale Price Override (Registration)</label>
                      <input
                        type="number"
                        value={editForm.sale_registration}
                        onChange={(e) => setEditForm({ ...editForm, sale_registration: e.target.value })}
                        placeholder="Auto from margin"
                        className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-orange-dark dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange focus:border-transparent"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Sale Price Override (Renewal)</label>
                      <input
                        type="number"
                        value={editForm.sale_renewal}
                        onChange={(e) => setEditForm({ ...editForm, sale_renewal: e.target.value })}
                        placeholder="Auto from margin"
                        className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-orange-dark dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange focus:border-transparent"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Sale Price Override (Transfer)</label>
                      <input
                        type="number"
                        value={editForm.sale_transfer}
                        onChange={(e) => setEditForm({ ...editForm, sale_transfer: e.target.value })}
                        placeholder="Auto from margin"
                        className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-orange-dark dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange focus:border-transparent"
                        step="0.01"
                      />
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Leave fields empty to use the global margin calculation. Setting a sale price override takes precedence over margin.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={handleSaveTld}
                      className="px-4 py-1.5 text-sm font-medium rounded-lg bg-orange text-white hover:bg-orange/90 transition-colors"
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={() => setEditingTld(null)}
                      className="px-4 py-1.5 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Pagination */}
              {tldTotalPages > 1 && (
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setTldPage((p) => Math.max(1, p - 1))}
                    disabled={tldPage === 1}
                    className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-orange-dark dark:text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Page {tldPage} of {tldTotalPages}
                  </span>
                  <button
                    onClick={() => setTldPage((p) => Math.min(tldTotalPages, p + 1))}
                    disabled={tldPage === tldTotalPages}
                    className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-orange-dark dark:text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
```

- [ ] **Step 2: Verify the page compiles and renders**

```bash
cd /Users/sethchesky/Documents/GitHub/javelina
npm run dev
```

Navigate to `/admin/opensrs`, click the "TLD Pricing" tab. Confirm:
- Global margin control renders at top
- Search and "Refresh Wholesale Prices" button render
- Table shows TLD data (or empty state if not seeded)
- Pagination works
- Edit panel appears when clicking Edit
- Dark mode works

- [ ] **Step 3: Commit**

```bash
cd /Users/sethchesky/Documents/GitHub/javelina
git add app/admin/opensrs/page.tsx
git commit -m "feat(admin): add TLD Pricing tab with margin controls and inline editing"
```

---

## Task 8: Seed the database and verify end-to-end

- [ ] **Step 1: Run both dev servers**

```bash
# Terminal 1
cd /Users/sethchesky/Documents/GitHub/javelina-backend && npm run dev

# Terminal 2
cd /Users/sethchesky/Documents/GitHub/javelina && npm run dev
```

- [ ] **Step 2: Seed wholesale prices**

Navigate to `/admin/opensrs`, click "TLD Pricing" tab, click "Refresh Wholesale Prices". Wait for the seed to complete (this calls OpenSRS API for 87 TLDs × 3 product types = 261 API calls).

Verify toast shows success count.

- [ ] **Step 3: Verify the table**

1. Table shows 87 TLDs with wholesale prices populated
2. Sale prices show current hardcoded values (as overrides)
3. Global margin is 30%
4. Edit a TLD — change margin override, save, verify price recalculates
5. Clear a sale override — verify it falls back to margin calculation
6. Toggle active/inactive — verify it works
7. Change global margin — verify all non-overridden TLDs update
8. Search for a TLD — verify filtering works
9. Pagination shows 10 per page

- [ ] **Step 4: Verify customer-facing pricing unchanged**

Navigate to the user-facing domain search and search for a domain. Verify the prices shown match what was previously hardcoded (since we set sale overrides during seed).
