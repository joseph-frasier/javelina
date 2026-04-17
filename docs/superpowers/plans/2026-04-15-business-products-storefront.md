# Business Products Storefront Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a lightweight storefront page at `/storefront` where authenticated users can subscribe to managed business products (Business Starter, Business Pro) via Stripe Checkout, completely decoupled from the existing org/plan architecture.

**Architecture:** New `storefront_products` and `storefront_subscriptions` database tables. New backend controller/routes under `/api/storefront`. New Next.js page at `/storefront` with product cards gated by LaunchDarkly flags. Stripe Checkout Sessions (hosted redirect) for payment. Webhook routing extended to handle storefront subscriptions.

**Tech Stack:** Next.js (frontend), Express (backend), Supabase (PostgreSQL), Stripe Checkout API, LaunchDarkly

**Spec:** `docs/superpowers/specs/2026-04-15-business-products-storefront-design.md`

**Important constraints:**
- All database changes target Supabase branch `ipfsrbxjgewhdcvonrbo` ONLY
- Migration files are created locally but NOT applied — Seth applies manually
- Both repos must be on branch `feat/opensrs-mailbox`
- These products are NOT tied to organizations

---

### Task 1: Database Migration — Create Storefront Tables

**Files:**
- Create: `javelina/supabase/migrations/20260415000000_create_storefront_tables.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- Create storefront_products table
CREATE TABLE IF NOT EXISTS storefront_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  stripe_product_id TEXT,
  stripe_price_id TEXT,
  price NUMERIC NOT NULL,
  billing_interval TEXT NOT NULL DEFAULT 'month',
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create storefront_subscriptions table
CREATE TABLE IF NOT EXISTS storefront_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  product_id UUID NOT NULL REFERENCES storefront_products(id),
  customer_name TEXT,
  customer_email TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_storefront_subscriptions_user_id ON storefront_subscriptions(user_id);
CREATE INDEX idx_storefront_subscriptions_stripe_subscription_id ON storefront_subscriptions(stripe_subscription_id);
CREATE INDEX idx_storefront_products_code ON storefront_products(code);

-- Updated_at trigger for storefront_products
CREATE TRIGGER set_storefront_products_updated_at
  BEFORE UPDATE ON storefront_products
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime(updated_at);

-- Updated_at trigger for storefront_subscriptions
CREATE TRIGGER set_storefront_subscriptions_updated_at
  BEFORE UPDATE ON storefront_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime(updated_at);

-- RLS
ALTER TABLE storefront_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE storefront_subscriptions ENABLE ROW LEVEL SECURITY;

-- storefront_products: all authenticated users can read
CREATE POLICY "Authenticated users can view storefront products"
  ON storefront_products
  FOR SELECT
  TO authenticated
  USING (true);

-- storefront_subscriptions: users can read their own
CREATE POLICY "Users can view their own storefront subscriptions"
  ON storefront_subscriptions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- storefront_subscriptions: users can insert their own
CREATE POLICY "Users can create their own storefront subscriptions"
  ON storefront_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Service role can do anything (for webhook updates)
-- Note: service_role bypasses RLS by default in Supabase, so no explicit policy needed

-- Seed data: Business Starter
INSERT INTO storefront_products (code, name, description, price, billing_interval, features, is_active)
VALUES (
  'business_starter',
  'Javelina Business Starter',
  'Everything you need to get your business online with a fully managed website.',
  99.88,
  'month',
  '["Domain Registration", "SSL Certificates", "Javelina DNS", "Website Hosting (1–3 page site)", "Business Email", "Fully Managed Business Website"]'::jsonb,
  true
);

-- Seed data: Business Pro
INSERT INTO storefront_products (code, name, description, price, billing_interval, features, is_active)
VALUES (
  'business_pro',
  'Javelina Business Pro',
  'Premium business package with Microsoft 365 email and a custom AI agent.',
  157.77,
  'month',
  '["Domain Registration", "SSL Certificates", "Javelina DNS", "Microsoft 365 Email", "Business Website (1–5 pages)", "Custom AI Agent"]'::jsonb,
  true
);
```

Write this file to `javelina/supabase/migrations/20260415000000_create_storefront_tables.sql`.

- [ ] **Step 2: Verify the migration file exists and looks correct**

Run: `cat javelina/supabase/migrations/20260415000000_create_storefront_tables.sql | head -20`
Expected: First 20 lines of the migration showing the `CREATE TABLE` statement.

**NOTE:** Do NOT apply this migration. Seth will apply it manually to the Supabase branch `ipfsrbxjgewhdcvonrbo`.

- [ ] **Step 3: Commit**

```bash
cd javelina
git add supabase/migrations/20260415000000_create_storefront_tables.sql
git commit -m "feat(storefront): add migration for storefront_products and storefront_subscriptions tables"
```

---

### Task 2: Backend — Storefront Controller

**Files:**
- Create: `javelina-backend/src/controllers/storefrontController.ts`

- [ ] **Step 1: Create the storefront controller**

```typescript
import { Response } from "express";
import Stripe from "stripe";
import { supabaseAdmin } from "../config/supabase";
import { stripe } from "../config/stripe";
import { env } from "../config/env";
import { AuthenticatedRequest } from "../types";
import { sendSuccess, sendError, sendValidationError } from "../utils/response";

// =====================================================
// GET STOREFRONT PRODUCTS
// =====================================================

export const getStorefrontProducts = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { data: products, error } = await supabaseAdmin
      .from("storefront_products")
      .select("*")
      .eq("is_active", true)
      .order("price", { ascending: true });

    if (error) {
      console.error("Error fetching storefront products:", error);
      sendError(res, "Failed to fetch storefront products", 500);
      return;
    }

    sendSuccess(res, products, "Storefront products fetched successfully");
  } catch (error: any) {
    console.error("Error in getStorefrontProducts:", error);
    sendError(res, error.message || "Failed to fetch storefront products", 500);
  }
};

// =====================================================
// CREATE STOREFRONT CHECKOUT SESSION
// =====================================================

export const createStorefrontCheckout = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { productCode, customerName, customerEmail } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      sendError(res, "Authentication required", 401);
      return;
    }

    if (!productCode) {
      sendValidationError(res, "productCode is required");
      return;
    }

    if (!stripe) {
      sendError(res, "Stripe is not configured", 500);
      return;
    }

    // Look up the product
    const { data: product, error: productError } = await supabaseAdmin
      .from("storefront_products")
      .select("*")
      .eq("code", productCode)
      .eq("is_active", true)
      .single();

    if (productError || !product) {
      sendError(res, "Product not found or inactive", 404);
      return;
    }

    if (!product.stripe_price_id) {
      sendError(res, "Product is not yet configured for billing", 500);
      return;
    }

    // Determine the customer email for Stripe
    // If purchasing on behalf of someone, use their email; otherwise use the logged-in user's email
    let billingEmail = customerEmail;

    if (!billingEmail) {
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
      billingEmail = userData?.user?.email;
    }

    if (!billingEmail) {
      sendError(res, "Could not determine customer email", 400);
      return;
    }

    // Build the frontend origin URL
    const origin = env.FRONTEND_URL || "http://localhost:3000";

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: billingEmail,
      line_items: [
        {
          price: product.stripe_price_id,
          quantity: 1,
        },
      ],
      automatic_tax: { enabled: true },
      success_url: `${origin}/storefront?status=success`,
      cancel_url: `${origin}/storefront?status=canceled`,
      metadata: {
        type: "storefront",
        product_code: product.code,
        product_id: product.id,
        user_id: userId,
        customer_name: customerName || "",
        customer_email: customerEmail || "",
      },
      subscription_data: {
        metadata: {
          type: "storefront",
          product_code: product.code,
          product_id: product.id,
          user_id: userId,
          customer_name: customerName || "",
          customer_email: customerEmail || "",
        },
      },
    });

    sendSuccess(res, { url: session.url }, "Checkout session created");
  } catch (error: any) {
    console.error("Error creating storefront checkout session:", error);
    sendError(res, error.message || "Failed to create checkout session", 500);
  }
};

// =====================================================
// WEBHOOK HANDLERS FOR STOREFRONT SUBSCRIPTIONS
// =====================================================

/**
 * Handle a storefront checkout session completion.
 * Called from the main webhook handler in stripeController when metadata.type === "storefront".
 */
export async function processStorefrontCheckout(
  session: Stripe.Checkout.Session
): Promise<void> {
  console.log("🛒 Storefront checkout session completed:", session.id);

  const metadata = session.metadata;
  if (!metadata) {
    console.error("No metadata on storefront checkout session");
    return;
  }

  const {
    product_code,
    product_id,
    user_id,
    customer_name,
    customer_email,
  } = metadata;

  const stripeSubscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : (session.subscription as any)?.id;

  const stripeCustomerId =
    typeof session.customer === "string"
      ? session.customer
      : (session.customer as any)?.id;

  if (!stripeSubscriptionId) {
    console.error("No subscription ID on storefront checkout session");
    return;
  }

  // Create the storefront_subscriptions record
  const { error } = await supabaseAdmin
    .from("storefront_subscriptions")
    .insert({
      user_id,
      product_id,
      customer_name: customer_name || null,
      customer_email: customer_email || null,
      stripe_customer_id: stripeCustomerId || null,
      stripe_subscription_id: stripeSubscriptionId,
      status: "active",
    });

  if (error) {
    console.error("Error creating storefront subscription record:", error);
    throw error;
  }

  console.log("✅ Storefront subscription record created for product:", product_code);
}

/**
 * Handle storefront subscription updates (status changes, period changes).
 * Called from the main webhook handler when the subscription ID exists in storefront_subscriptions.
 */
export async function processStorefrontSubscriptionUpdate(
  subscription: Stripe.Subscription
): Promise<void> {
  console.log("🔄 Storefront subscription updated:", subscription.id);

  const subAny = subscription as any;
  const updateData: Record<string, any> = {
    status: subscription.status,
  };

  if (subAny.current_period_start) {
    updateData.current_period_start = new Date(subAny.current_period_start * 1000).toISOString();
  }
  if (subAny.current_period_end) {
    updateData.current_period_end = new Date(subAny.current_period_end * 1000).toISOString();
  }
  if (subscription.cancel_at) {
    updateData.cancel_at = new Date(subscription.cancel_at * 1000).toISOString();
  } else {
    updateData.cancel_at = null;
  }

  const { error } = await supabaseAdmin
    .from("storefront_subscriptions")
    .update(updateData)
    .eq("stripe_subscription_id", subscription.id);

  if (error) {
    console.error("Error updating storefront subscription:", error);
    throw error;
  }

  console.log("✅ Storefront subscription updated:", subscription.id);
}

/**
 * Handle storefront subscription deletion/cancellation.
 */
export async function processStorefrontSubscriptionDeleted(
  subscription: Stripe.Subscription
): Promise<void> {
  console.log("❌ Storefront subscription deleted:", subscription.id);

  const { error } = await supabaseAdmin
    .from("storefront_subscriptions")
    .update({ status: "canceled" })
    .eq("stripe_subscription_id", subscription.id);

  if (error) {
    console.error("Error canceling storefront subscription:", error);
    throw error;
  }

  console.log("✅ Storefront subscription canceled:", subscription.id);
}

/**
 * Check if a Stripe subscription ID belongs to a storefront subscription.
 */
export async function isStorefrontSubscription(
  stripeSubscriptionId: string
): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("storefront_subscriptions")
    .select("id")
    .eq("stripe_subscription_id", stripeSubscriptionId)
    .maybeSingle();

  if (error) {
    console.error("Error checking storefront subscription:", error);
    return false;
  }

  return !!data;
}
```

Write this to `javelina-backend/src/controllers/storefrontController.ts`.

- [ ] **Step 2: Verify the file compiles**

Run: `cd javelina-backend && npx tsc --noEmit src/controllers/storefrontController.ts 2>&1 | head -20`

If there are import path issues (e.g., `env.FRONTEND_URL` doesn't exist), check the actual env config:

Run: `grep -n "FRONTEND_URL\|CLIENT_URL\|APP_URL" javelina-backend/src/config/env.ts`

Fix the env variable name to match whatever the project actually uses for the frontend origin.

- [ ] **Step 3: Commit**

```bash
cd javelina-backend
git add src/controllers/storefrontController.ts
git commit -m "feat(storefront): add storefront controller with checkout and webhook handlers"
```

---

### Task 3: Backend — Storefront Routes

**Files:**
- Create: `javelina-backend/src/routes/storefront.ts`
- Modify: `javelina-backend/src/routes/index.ts`

- [ ] **Step 1: Create the storefront routes file**

```typescript
import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { requireEmailVerification } from "../middleware/requireEmailVerification";
import { asyncHandler } from "../middleware/errorHandler";
import { billingRateLimiter } from "../middleware/rateLimit";
import {
  getStorefrontProducts,
  createStorefrontCheckout,
} from "../controllers/storefrontController";

const router = Router();

/**
 * GET /api/storefront/products
 * List all active storefront products
 * Protected route - requires authentication
 */
router.get(
  "/products",
  authenticate,
  asyncHandler(getStorefrontProducts)
);

/**
 * POST /api/storefront/checkout
 * Create a Stripe Checkout Session for a storefront product
 * Protected route - requires authentication, verified email, and rate limiting
 */
router.post(
  "/checkout",
  authenticate,
  requireEmailVerification,
  billingRateLimiter,
  asyncHandler(createStorefrontCheckout)
);

export default router;
```

Write this to `javelina-backend/src/routes/storefront.ts`.

- [ ] **Step 2: Register the storefront routes in the route index**

In `javelina-backend/src/routes/index.ts`, add the import and mount:

Add import after the mailbox import (line 20):
```typescript
import storefrontRoutes from "./storefront";
```

Add route mount after the mailbox mount (line 43):
```typescript
router.use("/storefront", storefrontRoutes);
```

- [ ] **Step 3: Verify the backend compiles**

Run: `cd javelina-backend && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors (or only pre-existing errors unrelated to storefront).

- [ ] **Step 4: Commit**

```bash
cd javelina-backend
git add src/routes/storefront.ts src/routes/index.ts
git commit -m "feat(storefront): add storefront routes and register in route index"
```

---

### Task 4: Backend — Extend Webhook Handler for Storefront

**Files:**
- Modify: `javelina-backend/src/controllers/stripeController.ts`

- [ ] **Step 1: Add storefront imports at the top of stripeController.ts**

At the top of the file, after the existing imports (around line 32), add:

```typescript
import {
  processStorefrontCheckout,
  processStorefrontSubscriptionUpdate,
  processStorefrontSubscriptionDeleted,
  isStorefrontSubscription,
} from "./storefrontController";
```

- [ ] **Step 2: Add storefront routing in `handleCheckoutSessionCompleted`**

In `handleCheckoutSessionCompleted` (line 2284), add a new metadata check for storefront sessions. Add this block after the SSL certificate check (around line 2315) and before the final `console.log`:

```typescript
    // Handle storefront product checkout sessions
    if (metadata?.type === "storefront") {
      await processStorefrontCheckout(session);
      return;
    }
```

- [ ] **Step 3: Add storefront routing in subscription event handlers**

In the webhook `switch` statement (around line 1384), the existing `customer.subscription.created`, `customer.subscription.updated`, and `customer.subscription.deleted` cases call their respective handlers. Those handlers need to check if the subscription belongs to the storefront before processing.

In `handleSubscriptionCreated` (line 1765), add a storefront check at the very beginning of the `try` block, before the `orgId` check:

```typescript
    // Check if this is a storefront subscription
    if (subscription.metadata?.type === "storefront") {
      console.log("ℹ️ Storefront subscription created - handled via checkout.session.completed");
      return;
    }
```

In `handleSubscriptionUpdated` (find the function), add a storefront check at the beginning of the `try` block:

```typescript
    // Check if this is a storefront subscription
    const isStorefront = await isStorefrontSubscription(subscription.id);
    if (isStorefront) {
      await processStorefrontSubscriptionUpdate(subscription);
      return;
    }
```

In `handleSubscriptionDeleted` (find the function), add the same storefront check at the beginning:

```typescript
    // Check if this is a storefront subscription
    const isStorefront = await isStorefrontSubscription(subscription.id);
    if (isStorefront) {
      await processStorefrontSubscriptionDeleted(subscription);
      return;
    }
```

- [ ] **Step 4: Verify the backend compiles**

Run: `cd javelina-backend && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
cd javelina-backend
git add src/controllers/stripeController.ts
git commit -m "feat(storefront): extend webhook handler to route storefront subscription events"
```

---

### Task 5: Frontend — Add LaunchDarkly Flags for Storefront

**Files:**
- Modify: `javelina/lib/hooks/useFeatureFlags.ts`

- [ ] **Step 1: Add storefront flags to the FeatureFlags interface**

In `useFeatureFlags.ts`, add three new properties to the `FeatureFlags` interface (after line 25, before the closing `}`):

```typescript
  /** Show the Business Products storefront page and header link */
  showBusinessProducts: boolean;
  /** Show the Business Starter product in the storefront */
  showBusinessStarter: boolean;
  /** Show the Business Pro product in the storefront */
  showBusinessPro: boolean;
```

- [ ] **Step 2: Add defaults to DEFAULT_FLAGS**

In the `DEFAULT_FLAGS` object (after line 40, before the closing `}`):

```typescript
  showBusinessProducts: false,
  showBusinessStarter: false,
  showBusinessPro: false,
```

- [ ] **Step 3: Add flag keys to LD_FLAG_KEYS**

In the `LD_FLAG_KEYS` object (after line 55, before the closing `}`):

```typescript
  SHOW_BUSINESS_PRODUCTS: 'store-show-business-products',
  SHOW_BUSINESS_STARTER: 'store-show-business-starter',
  SHOW_BUSINESS_PRO: 'store-show-business-pro',
```

- [ ] **Step 4: Add flag reading in the updateFlags function**

In the `updateFlags` function inside `useFeatureFlags` (around line 80), add to the `newFlags` object:

```typescript
          showBusinessProducts: allFlags[LD_FLAG_KEYS.SHOW_BUSINESS_PRODUCTS] ?? DEFAULT_FLAGS.showBusinessProducts,
          showBusinessStarter: allFlags[LD_FLAG_KEYS.SHOW_BUSINESS_STARTER] ?? DEFAULT_FLAGS.showBusinessStarter,
          showBusinessPro: allFlags[LD_FLAG_KEYS.SHOW_BUSINESS_PRO] ?? DEFAULT_FLAGS.showBusinessPro,
```

- [ ] **Step 5: Add flag reading in the getFeatureFlags helper**

In the `getFeatureFlags` function (around line 127), add to the returned object:

```typescript
    showBusinessProducts: ldFlags[LD_FLAG_KEYS.SHOW_BUSINESS_PRODUCTS] ?? DEFAULT_FLAGS.showBusinessProducts,
    showBusinessStarter: ldFlags[LD_FLAG_KEYS.SHOW_BUSINESS_STARTER] ?? DEFAULT_FLAGS.showBusinessStarter,
    showBusinessPro: ldFlags[LD_FLAG_KEYS.SHOW_BUSINESS_PRO] ?? DEFAULT_FLAGS.showBusinessPro,
```

- [ ] **Step 6: Commit**

```bash
cd javelina
git add lib/hooks/useFeatureFlags.ts
git commit -m "feat(storefront): add LaunchDarkly flags for business products storefront"
```

---

### Task 6: Frontend — Add Storefront API Client

**Files:**
- Modify: `javelina/lib/api-client.ts`

- [ ] **Step 1: Add the storefrontApi object**

In `api-client.ts`, add the following after the `plansApi` object (after line 282):

```typescript
// Storefront API
export const storefrontApi = {
  /**
   * Get all active storefront products
   */
  getProducts: () => {
    return apiClient.get('/storefront/products');
  },

  /**
   * Create a Stripe Checkout Session for a storefront product
   */
  createCheckout: (productCode: string, customerName?: string, customerEmail?: string) => {
    return apiClient.post<{ url: string }>('/storefront/checkout', {
      productCode,
      customerName,
      customerEmail,
    });
  },
};
```

- [ ] **Step 2: Commit**

```bash
cd javelina
git add lib/api-client.ts
git commit -m "feat(storefront): add storefront API client methods"
```

---

### Task 7: Frontend — Create the Storefront Page

**Files:**
- Create: `javelina/app/storefront/page.tsx`

- [ ] **Step 1: Create the storefront page**

```tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';
import Button from '@/components/ui/Button';
import { useAuthStore } from '@/lib/auth-store';
import { useToastStore } from '@/lib/toast-store';
import { useFeatureFlags } from '@/lib/hooks/useFeatureFlags';
import { storefrontApi } from '@/lib/api-client';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { gsap } from 'gsap';

interface StorefrontProduct {
  id: string;
  code: string;
  name: string;
  description: string;
  price: number;
  billing_interval: string;
  features: string[];
  is_active: boolean;
}

export default function StorefrontPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = searchParams.get('status');
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const addToast = useToastStore((state) => state.addToast);
  const { showBusinessProducts, showBusinessStarter, showBusinessPro } = useFeatureFlags();

  const [products, setProducts] = useState<StorefrontProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [showCustomerFields, setShowCustomerFields] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');

  const contentRef = useRef<HTMLDivElement>(null);
  const [isInitialMount, setIsInitialMount] = useState(true);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/storefront');
    }
  }, [isAuthenticated, router]);

  // Redirect if master flag is off
  useEffect(() => {
    if (!loading && !showBusinessProducts) {
      router.push('/');
    }
  }, [showBusinessProducts, loading, router]);

  // Show toast on return from Stripe
  useEffect(() => {
    if (status === 'success') {
      addToast('success', 'Subscription created successfully! You will receive a confirmation email shortly.');
    } else if (status === 'canceled') {
      addToast('info', 'Checkout was canceled. No charges were made.');
    }
  }, [status, addToast]);

  // Fetch products
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const data = await storefrontApi.getProducts();
        setProducts(data);
      } catch (error) {
        console.error('Failed to load storefront products:', error);
        addToast('error', 'Failed to load products');
      } finally {
        setLoading(false);
      }
    };
    if (isAuthenticated) {
      loadProducts();
    }
  }, [isAuthenticated, addToast]);

  // GSAP page transition
  useEffect(() => {
    if (contentRef.current && isInitialMount && !loading) {
      gsap.fromTo(
        contentRef.current,
        { opacity: 0, x: 30 },
        {
          opacity: 1,
          x: 0,
          duration: 0.5,
          ease: 'power2.out',
          onComplete: () => setIsInitialMount(false),
        }
      );
    }
  }, [isInitialMount, loading]);

  const handleSubscribe = async (productCode: string) => {
    setCheckoutLoading(productCode);
    try {
      const result = await storefrontApi.createCheckout(
        productCode,
        showCustomerFields ? customerName : undefined,
        showCustomerFields ? customerEmail : undefined,
      );

      if (result.url) {
        window.location.href = result.url;
      } else {
        addToast('error', 'Failed to create checkout session');
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      addToast('error', error.message || 'Failed to start checkout');
    } finally {
      setCheckoutLoading(null);
    }
  };

  // Filter products by individual LD flags
  const visibleProducts = products.filter((product) => {
    if (product.code === 'business_starter' && !showBusinessStarter) return false;
    if (product.code === 'business_pro' && !showBusinessPro) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-orange-light">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange"></div>
          <span className="text-orange-dark">Loading storefront...</span>
        </div>
      </div>
    );
  }

  if (!showBusinessProducts) {
    return null;
  }

  return (
    <div className="min-h-screen bg-orange-light">
      {/* Header */}
      <header className="border-b border-gray-light bg-white" role="banner">
        <div className="max-w-7xl mx-auto pl-2 pr-4 sm:pl-3 sm:pr-6 lg:pl-4 lg:pr-8 py-1 flex items-center justify-between">
          <Link href="/" className="inline-block cursor-pointer" aria-label="Go to home page">
            <Logo width={150} height={60} />
          </Link>
          <Breadcrumb
            items={[
              { label: 'Dashboard', href: '/' },
              { label: 'Storefront' },
            ]}
          />
        </div>
      </header>

      {/* Main Content */}
      <main ref={contentRef} className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8" role="main">
        {/* Hero */}
        <section className="text-center mb-10" aria-labelledby="storefront-heading">
          <h1 id="storefront-heading" className="text-3xl font-black text-orange-dark mb-2">
            Business Services
          </h1>
          <p className="text-base text-gray-slate font-light max-w-2xl mx-auto">
            Fully managed business packages. Domain, hosting, email, and website — all included in one monthly subscription.
          </p>
        </section>

        {/* Purchasing on behalf of someone else */}
        <section className="max-w-xl mx-auto mb-8">
          <button
            type="button"
            onClick={() => setShowCustomerFields(!showCustomerFields)}
            className="text-sm text-orange hover:text-orange-dark font-medium transition-colors"
          >
            {showCustomerFields ? 'Cancel — purchasing for myself' : 'Purchasing for someone else?'}
          </button>
          {showCustomerFields && (
            <div className="mt-3 p-4 bg-white rounded-lg border border-gray-light space-y-3">
              <p className="text-xs text-gray-slate">
                Enter the customer&apos;s details. They will receive invoices at the email below.
              </p>
              <div>
                <label htmlFor="customer-name" className="block text-sm font-medium text-orange-dark mb-1">
                  Customer Name
                </label>
                <input
                  id="customer-name"
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-3 py-2 border border-gray-light rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="customer-email" className="block text-sm font-medium text-orange-dark mb-1">
                  Customer Email
                </label>
                <input
                  id="customer-email"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="w-full px-3 py-2 border border-gray-light rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange focus:border-transparent"
                />
              </div>
            </div>
          )}
        </section>

        {/* Product Cards */}
        <section aria-labelledby="products-heading">
          <h2 id="products-heading" className="sr-only">Available Products</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {visibleProducts.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-xl border-2 border-gray-light shadow-lg p-6 flex flex-col"
              >
                <h3 className="text-xl font-bold text-orange-dark mb-1">
                  {product.name}
                </h3>
                <p className="text-sm text-gray-slate font-light mb-4">
                  {product.description}
                </p>

                {/* Price */}
                <div className="mb-4">
                  <span className="text-3xl font-black text-orange-dark">
                    ${product.price.toFixed(2)}
                  </span>
                  <span className="text-sm text-gray-slate font-light">
                    /{product.billing_interval} + applicable tax
                  </span>
                </div>

                {/* Features */}
                <ul className="space-y-2 mb-6 flex-1">
                  {product.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start">
                      <svg
                        className="w-5 h-5 text-orange mr-2 flex-shrink-0 mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span className="text-sm text-gray-slate font-regular">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Subscribe Button */}
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full"
                  onClick={() => handleSubscribe(product.code)}
                  disabled={checkoutLoading !== null}
                >
                  {checkoutLoading === product.code ? 'Redirecting...' : 'Subscribe'}
                </Button>
              </div>
            ))}
          </div>

          {visibleProducts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-slate">No products are currently available.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
```

Write this to `javelina/app/storefront/page.tsx`.

- [ ] **Step 2: Verify the page compiles**

Run: `cd javelina && npx tsc --noEmit 2>&1 | grep "storefront" | head -10`
Expected: No errors related to storefront files.

- [ ] **Step 3: Commit**

```bash
cd javelina
git add app/storefront/page.tsx
git commit -m "feat(storefront): add storefront page with product cards and checkout flow"
```

---

### Task 8: Frontend — Add Storefront Link to Header

**Files:**
- Modify: `javelina/components/layout/Header.tsx`

- [ ] **Step 1: Destructure the new flag in the Header component**

In `Header.tsx` line 25, update the destructured flags:

Change:
```typescript
  const { showDomainsIntegration, showOpenSrsStorefront } = useFeatureFlags();
```

To:
```typescript
  const { showDomainsIntegration, showOpenSrsStorefront, showBusinessProducts } = useFeatureFlags();
```

- [ ] **Step 2: Add the Storefront link in the nav**

After the "Purchase Domain" link block (after line 189, before the closing `</nav>`), add:

```tsx
              {showBusinessProducts && (
                <Link
                  href="/storefront"
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-orange hover:bg-[#d46410] rounded-md transition-colors"
                >
                  Storefront
                </Link>
              )}
```

- [ ] **Step 3: Commit**

```bash
cd javelina
git add components/layout/Header.tsx
git commit -m "feat(storefront): add Storefront link to header, gated by LD flag"
```

---

### Task 9: Manual Steps Checklist (Not Code — Reference for Seth)

This task is a reference list of manual steps required to complete the feature. No code changes.

- [ ] **Step 1: Apply the database migration**

Apply `supabase/migrations/20260415000000_create_storefront_tables.sql` to Supabase branch `ipfsrbxjgewhdcvonrbo`.

- [ ] **Step 2: Create Stripe Products and Prices**

In the Stripe dashboard (test mode first, then live):

1. Create product "Javelina Business Starter" with a recurring price of $99.88/month, tax behavior: exclusive
2. Create product "Javelina Business Pro" with a recurring price of $157.77/month, tax behavior: exclusive
3. Note the `prod_*` and `price_*` IDs

- [ ] **Step 3: Update storefront_products with Stripe IDs**

Run SQL on the Supabase branch to update the seed data:

```sql
UPDATE storefront_products
SET stripe_product_id = 'prod_XXXX', stripe_price_id = 'price_XXXX'
WHERE code = 'business_starter';

UPDATE storefront_products
SET stripe_product_id = 'prod_YYYY', stripe_price_id = 'price_YYYY'
WHERE code = 'business_pro';
```

- [ ] **Step 4: Create LaunchDarkly flags**

In the LaunchDarkly dashboard, create these boolean flags (default: `false`):

1. `store-show-business-products` — Master toggle for storefront
2. `store-show-business-starter` — Toggle for Business Starter card
3. `store-show-business-pro` — Toggle for Business Pro card

- [ ] **Step 5: Enable flags for testing**

Turn on all three flags for your test environment/user to verify the storefront works end-to-end.

- [ ] **Step 6: Test the full flow**

1. Visit `/storefront` — verify products display
2. Click Subscribe — verify redirect to Stripe Checkout
3. Complete payment with test card — verify redirect back to `/storefront?status=success`
4. Check `storefront_subscriptions` table — verify record created
5. Test "Purchasing for someone else?" flow with a different email
6. Toggle individual product flags off — verify cards hide
7. Toggle master flag off — verify page redirects to home and header link disappears
