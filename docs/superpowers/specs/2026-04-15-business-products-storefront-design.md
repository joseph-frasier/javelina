# Business Products Storefront — Design Spec

**Date:** 2026-04-15
**Branch:** `feat/opensrs-mailbox`
**Supabase Branch ID:** `ipfsrbxjgewhdcvonrbo`

## Overview

A lightweight, auth-gated storefront page at `/storefront` where logged-in Javelina users can subscribe to managed business service products via Stripe Checkout. Completely decoupled from the existing organization/plan/subscription architecture.

Primary use cases:
- A customer logs in and purchases a managed business product for themselves
- An Irongrove employee purchases a product on behalf of a customer (entering the customer's name/email at checkout)

## Products

| Product | Code | Price | Features |
|---|---|---|---|
| Javelina Business Starter | `business_starter` | $99.88/mo + tax | Domain Registration, SSL Certificates, Javelina DNS, Website Hosting (1-3 page site), Business Email, Fully Managed Business Website |
| Javelina Business Pro | `business_pro` | $157.77/mo + tax | Domain Registration, SSL Certificates, Javelina DNS, Microsoft 365 Email, Business Website (1-5 pages), Custom AI Agent |

## What This Is NOT

- Not tied to organizations
- Not using the existing `plans` / `subscriptions` tables
- Not part of the upgrade/downgrade flow
- Not using entitlements or plan limits

## Database Schema

All changes applied to Supabase branch `ipfsrbxjgewhdcvonrbo` only.

### Table: `storefront_products`

Catalog of standalone purchasable products.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK, default `gen_random_uuid()` | |
| `code` | TEXT | UNIQUE, NOT NULL | e.g., `business_starter`, `business_pro` |
| `name` | TEXT | NOT NULL | Display name |
| `description` | TEXT | | Short description |
| `stripe_product_id` | TEXT | | Stripe Product ID |
| `stripe_price_id` | TEXT | | Stripe Price ID (monthly recurring) |
| `price` | NUMERIC | NOT NULL | Display price (e.g., 99.88) |
| `billing_interval` | TEXT | NOT NULL, default `'month'` | Billing cadence |
| `features` | JSONB | default `'[]'::jsonb` | Array of feature strings for UI display |
| `is_active` | BOOLEAN | default `true` | Soft toggle |
| `created_at` | TIMESTAMPTZ | default `now()` | |
| `updated_at` | TIMESTAMPTZ | default `now()` | |

### Table: `storefront_subscriptions`

Records of purchased storefront products.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK, default `gen_random_uuid()` | |
| `user_id` | UUID | FK to `auth.users`, NOT NULL | Javelina user who made the purchase (may be employee) |
| `product_id` | UUID | FK to `storefront_products`, NOT NULL | Which product was purchased |
| `customer_name` | TEXT | | Name of the actual customer (if purchasing on behalf) |
| `customer_email` | TEXT | | Email of the actual customer (used as Stripe Customer email) |
| `stripe_customer_id` | TEXT | | Stripe Customer ID |
| `stripe_subscription_id` | TEXT | UNIQUE | Stripe Subscription ID |
| `status` | TEXT | NOT NULL, default `'pending'` | `active`, `canceled`, `past_due`, `pending`, etc. |
| `current_period_start` | TIMESTAMPTZ | | |
| `current_period_end` | TIMESTAMPTZ | | |
| `cancel_at` | TIMESTAMPTZ | | Scheduled cancellation date |
| `metadata` | JSONB | default `'{}'::jsonb` | |
| `created_at` | TIMESTAMPTZ | default `now()` | |
| `updated_at` | TIMESTAMPTZ | default `now()` | |

### RLS Policies

- `storefront_products`: SELECT for all authenticated users
- `storefront_subscriptions`: SELECT/INSERT for authenticated users where `user_id = auth.uid()`; UPDATE restricted to status/period fields via webhook (service role)

### Seed Data

Two rows inserted into `storefront_products` with the product details above. `stripe_product_id` and `stripe_price_id` will be populated after creating the corresponding Stripe products (done manually or via Stripe dashboard).

## Frontend

### New Page: `/storefront`

- **Auth-gated**: redirects to `/login?redirect=/storefront` if not authenticated
- **Master LD flag gated**: if `store-show-business-products` is `false`, redirects to home
- **Layout**: consistent with existing Javelina pages (header, breadcrumb)
- **Content**:
  - Heading: "Business Services" (or similar)
  - Subheading: brief description
  - Two product cards side by side, each showing:
    - Product name
    - Price with "/month + applicable tax"
    - Feature list with checkmarks
    - "Subscribe" button
  - Each card individually gated by its LD flag (`store-show-business-starter`, `store-show-business-pro`)
- **"Purchasing for someone else?" toggle/section**:
  - When expanded, shows `customer_name` and `customer_email` input fields
  - These values are passed to the checkout session creation endpoint
  - When collapsed/empty, the logged-in user's own info is used
- **Success/cancel handling**:
  - Stripe redirects back to `/storefront?status=success` or `/storefront?status=canceled`
  - Show a toast notification on return

### Header Link

- "Storefront" link added to the main navigation
- Only visible when LD flag `store-show-business-products` is `true`

## Backend

### New Endpoint: `POST /api/storefront/checkout`

**Request body:**
```json
{
  "productCode": "business_starter",
  "customerName": "John Doe",       // optional
  "customerEmail": "john@example.com" // optional
}
```

**Logic:**
1. Validate the authenticated user
2. Look up the product by code in `storefront_products`; verify `is_active`
3. Determine the Stripe Customer email:
   - If `customerEmail` is provided, use it
   - Otherwise, use the authenticated user's email
4. Get or create a Stripe Customer with that email
5. Create a Stripe Checkout Session:
   - Mode: `subscription`
   - Price: product's `stripe_price_id`
   - `automatic_tax: { enabled: true }`
   - Success URL: `{origin}/storefront?status=success`
   - Cancel URL: `{origin}/storefront?status=canceled`
   - Metadata: `{ product_code, user_id, customer_name, customer_email }`
6. Return `{ url: checkoutSession.url }`

### Webhook Handling

Extend existing Stripe webhook handler to handle storefront subscriptions:

- **`checkout.session.completed`**: If metadata contains `product_code`, create a `storefront_subscriptions` row with user_id, product_id, customer info, Stripe IDs, and status `active`
- **`customer.subscription.updated`**: If the subscription ID exists in `storefront_subscriptions`, update `status`, `current_period_start`, `current_period_end`, `cancel_at`
- **`customer.subscription.deleted`**: Update status to `canceled`

Route events to `storefront_subscriptions` vs `subscriptions` based on whether the Stripe subscription ID exists in one table or the other.

## LaunchDarkly Flags

| Flag Key | Type | Default | Purpose |
|---|---|---|---|
| `store-show-business-products` | boolean | `false` | Master toggle: header link + `/storefront` page visibility |
| `store-show-business-starter` | boolean | `false` | Show/hide Business Starter product card |
| `store-show-business-pro` | boolean | `false` | Show/hide Business Pro product card |

All three flags must be created in the LaunchDarkly dashboard manually. Default to `false` so the storefront is hidden until intentionally enabled.

### Frontend Integration

Add to `useFeatureFlags.ts`:
- `showBusinessProducts` -> `store-show-business-products`
- `showBusinessStarter` -> `store-show-business-starter`
- `showBusinessPro` -> `store-show-business-pro`

## User Flow

### Customer self-purchase:
1. Customer navigates to `/storefront` (or clicks "Storefront" in header)
2. Logs in if not already authenticated
3. Sees available products
4. Clicks "Subscribe" on desired product
5. Redirected to Stripe Checkout (tax calculated automatically)
6. Completes payment
7. Redirected back to `/storefront?status=success`
8. Webhook creates `storefront_subscriptions` record

### Employee purchasing on behalf of customer:
1. Employee (logged into their Javelina account) navigates to `/storefront`
2. Clicks "Purchasing for someone else?"
3. Enters customer's name and email
4. Clicks "Subscribe"
5. Stripe Checkout Session created with customer's email
6. Employee completes payment (or shares Checkout URL with customer)
7. Customer receives Stripe invoices at their email
8. `storefront_subscriptions` row has `user_id` = employee, `customer_email` = customer

## Stripe Setup (Manual)

Before the storefront is functional, two Stripe Products and Prices must be created in the Stripe dashboard (or via API):

1. **Javelina Business Starter** — $99.88/month recurring, tax behavior: `exclusive`
2. **Javelina Business Pro** — $157.77/month recurring, tax behavior: `exclusive`

The resulting `prod_*` and `price_*` IDs must be added to the `storefront_products` seed data in the migration.

## Migration Strategy

- Migration file created locally, NOT applied automatically
- Migration targets Supabase branch `ipfsrbxjgewhdcvonrbo` only
- Seth applies the migration manually after review
