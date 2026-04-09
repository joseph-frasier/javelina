# TLD Pricing Controls — Design Spec

## Overview

Add a "TLD Pricing" tab to the admin OpenSRS Config page that allows admins to view and manage pricing for all 87 supported TLDs. Pricing moves from hardcoded source code into the database where it can be viewed and edited.

## Architecture

### Database

**New table: `tld_pricing`**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `tld` | text | NO | — | Primary key, e.g. `.com` |
| `wholesale_registration` | numeric(10,2) | NO | — | What we pay OpenSRS for registration |
| `wholesale_renewal` | numeric(10,2) | NO | — | What we pay OpenSRS for renewal |
| `wholesale_transfer` | numeric(10,2) | NO | — | What we pay OpenSRS for transfer |
| `sale_registration` | numeric(10,2) | YES | NULL | Manual override sale price for registration |
| `sale_renewal` | numeric(10,2) | YES | NULL | Manual override sale price for renewal |
| `sale_transfer` | numeric(10,2) | YES | NULL | Manual override sale price for transfer |
| `margin_override` | numeric(5,2) | YES | NULL | Per-TLD margin % override (if null, uses global) |
| `is_active` | boolean | NO | true | Whether this TLD is offered for sale |
| `created_at` | timestamptz | NO | now() | |
| `updated_at` | timestamptz | NO | now() | |

**New table: `app_settings`**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `key` | text | NO | — | Primary key, e.g. `global_tld_margin` |
| `value` | jsonb | NO | — | Setting value |
| `updated_at` | timestamptz | NO | now() | |

Seeded with: `{ key: 'global_tld_margin', value: 30 }` (30% default margin)

### Price Computation Logic

```
For each product type (registration, renewal, transfer):
  1. If sale_<type> override exists → use that directly
  2. Else if margin_override exists → wholesale_<type> × (1 + margin_override / 100)
  3. Else → wholesale_<type> × (1 + global_tld_margin / 100)
```

The computed sale price is what the customer sees and pays.

### Wholesale Price Seeding

A one-time backend endpoint `POST /admin/tld-pricing/seed` that:
1. Iterates all 87 TLDs from `DEFAULT_TLD_PRICING`
2. For each TLD, calls OpenSRS `get_price` API with `reg_type` = new, renewal, transfer
3. Inserts results into `tld_pricing` table with wholesale prices
4. Sets current hardcoded sale prices as `sale_<type>` overrides so customer-facing prices don't change

This can also be triggered from the admin UI as a "Refresh Wholesale Prices" button.

### Modifying `getDomainPrice()`

After migration, `getDomainPrice()` reads from the `tld_pricing` table instead of `DEFAULT_TLD_PRICING`. It computes the final sale price using the margin logic above. Falls back to `DEFAULT_TLD_PRICING` if DB query fails (safety net).

## Backend API

- `GET /admin/tld-pricing` — Returns all TLDs with wholesale, margin (effective), computed sale price, and override flags
- `GET /admin/tld-pricing/global-margin` — Returns current global margin
- `PUT /admin/tld-pricing/global-margin` — Update global margin percentage
- `PUT /admin/tld-pricing/:tld` — Update a single TLD (margin_override, sale price overrides, is_active)
- `POST /admin/tld-pricing/seed` — One-time seed: fetch wholesale prices from OpenSRS API and populate table

All endpoints require superuser auth.

## Frontend: "TLD Pricing" Tab

New tab on the OpenSRS Config page alongside "Transaction Log".

### Global Margin Control

At the top of the tab:
- Shows current global margin percentage
- Editable input with "Save" button
- Label: "Global Margin" with helper text explaining it applies to all TLDs without overrides

### TLD Pricing Table

Paginated (10 per page) table with columns:

| Column | Description |
|--------|-------------|
| TLD | e.g. `.com` |
| Wholesale | Registration / Renewal / Transfer costs displayed |
| Margin % | Effective margin (global or override). Visual indicator if overridden |
| Sale Price | Computed final price per product type |
| Active | Toggle for is_active |
| Actions | Edit button to open inline edit or modal |

### Editing a TLD

Clicking edit on a row allows:
- Setting a margin override (or clearing it to use global)
- Setting manual sale price overrides per product type (or clearing to use margin calculation)
- Toggling is_active

### Filtering

- Search by TLD name
- Paginated: 10 TLDs per page with Previous/Next controls

### Refresh Wholesale Prices

Button that triggers the seed endpoint to re-fetch wholesale prices from OpenSRS. Shows loading state and confirmation toast on completion.
