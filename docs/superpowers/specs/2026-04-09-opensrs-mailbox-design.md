# OpenSRS Mailbox Provisioning Design

## Overview

Add email mailbox provisioning as an add-on service for domains registered through Javelina. Customers can enable email on their domain, choose a storage tier, and manage mailboxes — all from the domain management page. End-user email settings (signatures, filters, autoresponders, etc.) are handled by OpenSRS branded webmail.

## Decisions

- **Scope:** Mailbox provisioning as a domain add-on (Option B). Checkout upsell (Option C) deferred to a future phase.
- **Email experience:** Branded webmail via OpenSRS — no in-app email client.
- **Tier model:** All mailboxes on a domain share one tier. Per-mailbox/month pricing, unlimited mailboxes.
- **Billing:** Per-mailbox/month, integrated with existing Stripe subscriptions.
- **Admin controls:** Pricing, margins, mailbox limits, and tier availability are admin-configurable.

## Pricing Tiers

All prices are admin-configurable. Default values:

| Tier       | Storage | OpenSRS Cost | Sale Price | Margin |
|------------|---------|-------------|------------|--------|
| Basic      | 5GB     | $0.50/mo    | $1.99/mo   | 75%    |
| Pro        | 25GB    | $2.50/mo    | $4.99/mo   | 50%    |
| Business   | 50GB    | $5.00/mo    | $9.99/mo   | 50%    |
| Enterprise | 100GB   | $10.00/mo   | $17.99/mo  | 44%    |

OpenSRS storage pricing: $0.50/month per 5GB block, stacking linearly up to 100GB max.

## Customer-Facing UI

### Location

New "Email" Card section on the domain details page (`/domains/[id]`), placed between Nameservers and WHOIS Contact Information sections.

### Initial State (no email enabled)

- Card title: "Email"
- Description text explaining the email add-on
- Tier selection: 4 cards in a horizontal grid (Basic/Pro/Business/Enterprise) showing storage and price per mailbox per month
- "Enable Email" button — provisions the domain with OpenSRS Mail and sets the chosen tier

### Active State (email enabled)

The Card expands to show:

- **Current plan badge** — tier name, storage, price
- **"Change Plan" button** — opens tier selector to upgrade/downgrade
- **Mailbox table** — columns: Email Address, Status, Created Date, Actions (reset password, delete)
- **"Add Mailbox" button** — opens form: email prefix input + auto-appended @domain.com, password field
- **Aliases section** — list with add/delete functionality
- **Webmail link** — button opening branded webmail URL in new tab
- **"Disable Email" danger zone** — with confirmation modal

### UI Patterns

Follows existing domain page conventions:
- Card component wrapping each section
- Standard Button, Input, Dropdown, Modal components
- Table pattern from admin pages
- Status badges with color coding
- Confirmation modals for destructive actions

## Admin UI

### Location

New **"Mailbox Pricing"** tab on the existing admin OpenSRS page (`/admin/opensrs`), alongside "Transaction Log" and "TLD Pricing".

### Layout

- **Mailbox Pricing Table** — 4 rows (one per tier), columns:
  - Tier Name
  - Storage
  - OpenSRS Cost
  - Margin %
  - Sale Price
  - Mailbox Limit (0 = unlimited)
  - Active toggle
  - Actions (Edit/Save/Cancel)
- **Edit panel** — inline grid form below table when editing (same pattern as TLD pricing)
- Override highlighting in orange when margin or price differs from defaults

## Backend Architecture

### New Service: `src/services/opensrs-mail.ts`

Separate from existing `opensrs.ts` (domain-focused). The Mail API is JSON-over-HTTP, different from the XML API used for domains.

**Methods:**
- `createMailDomain(domain)` — register domain with OpenSRS Mail
- `deleteMailDomain(domain)` — remove domain from mail service
- `createMailbox(domain, user, password, quota)` — provision a mailbox
- `deleteMailbox(domain, user)` — remove a mailbox
- `updateMailbox(domain, user, options)` — change password, quota
- `listMailboxes(domain)` — get all mailboxes for a domain
- `createAlias(domain, alias, target)` — create alias
- `deleteAlias(domain, alias)` — remove alias
- `listAliases(domain)` — get all aliases for a domain
- `setBranding(domain, options)` — configure branded webmail (logo, colors, URL)

### New Config: `src/config/opensrs-mail.ts`

Separate config for Mail API credentials (may differ from domain API credentials).

**Endpoints:**

| Environment | Mail API Endpoint                      |
|-------------|----------------------------------------|
| Test        | `https://admin.test.hostedemail.com/api` |
| Production A | `https://admin.a.hostedemail.com/api`  |
| Production B | `https://admin.b.hostedemail.com/api`  |

### New Controller & Routes

- `src/controllers/mailboxController.ts`
- `src/routes/mailbox.ts`

**Customer endpoints:**
- `POST /api/domains/:domainId/mail/enable` — enable email for domain (picks tier, provisions with OpenSRS)
- `DELETE /api/domains/:domainId/mail/disable` — disable email for domain
- `PUT /api/domains/:domainId/mail/plan` — change tier
- `GET /api/domains/:domainId/mailboxes` — list mailboxes
- `POST /api/domains/:domainId/mailboxes` — create mailbox
- `DELETE /api/domains/:domainId/mailboxes/:mailboxId` — delete mailbox
- `PUT /api/domains/:domainId/mailboxes/:mailboxId/password` — reset password
- `GET /api/domains/:domainId/aliases` — list aliases
- `POST /api/domains/:domainId/aliases` — create alias
- `DELETE /api/domains/:domainId/aliases/:aliasId` — delete alias

**Admin endpoints:**
- `GET /api/admin/mailbox-pricing` — get all tier pricing
- `PUT /api/admin/mailbox-pricing/:tierId` — update tier pricing/limits

### Database

Two new tables:

**`mailbox_pricing`** (admin-managed, like `tld_pricing`):
- `id` — UUID, primary key
- `tier_name` — text (Basic, Pro, Business, Enterprise)
- `storage_gb` — integer
- `opensrs_cost` — decimal
- `margin_percent` — decimal
- `sale_price_override` — decimal, nullable
- `mailbox_limit` — integer (0 = unlimited)
- `is_active` — boolean
- `created_at` — timestamp
- `updated_at` — timestamp

**`domain_mailboxes`** (tracks which domains have email enabled):
- `id` — UUID, primary key
- `domain_id` — UUID, FK to domains
- `tier_id` — UUID, FK to mailbox_pricing
- `opensrs_mail_domain_id` — text
- `status` — text (active, suspended, disabled)
- `created_at` — timestamp
- `updated_at` — timestamp

Individual mailboxes and aliases are managed directly via OpenSRS Mail API — no local duplication needed. Only the domain-level relationship and billing tier are stored locally.

### Billing

- Each domain with email enabled gets its own Stripe Subscription
- Subscription uses per-unit monthly price (quantity = number of mailboxes)
- When mailboxes are added/removed, subscription quantity is updated with proration
- When tier changes, subscription price is swapped to the new tier's price
- When email is disabled, subscription is canceled
- Stripe Products and Prices are created dynamically per tier and cached in `mailbox_pricing` table
- Webhook handlers for `invoice.payment_failed` and `customer.subscription.deleted` suspend email service

## Testing

- All provisioning operations testable against OpenSRS Horizon sandbox (`admin.test.hostedemail.com`)
- Email sending/receiving does not work in sandbox — provisioning only
- SSL cert may be invalid on test endpoint (may need to disable cert verification in dev)
- Branded webmail appearance requires production to verify

## Difficulty Assessment

**Overall: Moderate** — comparable to the domain registration feature already built.

| Area                          | Difficulty      | Notes                                                    |
|-------------------------------|----------------|----------------------------------------------------------|
| Backend — Mail Service        | Moderate       | New client, but JSON-over-HTTP is simpler than XML       |
| Backend — Routes/Controller/DB | Low           | Follows existing patterns exactly                        |
| Frontend — Domain Email Section | Moderate     | New tier selection UI, but uses existing components       |
| Frontend — Admin Pricing Tab  | Low            | Nearly identical to TLD pricing tab                      |
| Billing/Stripe Integration    | Moderate-High  | Subscription modification, proration, count syncing      |
| Branded Webmail Setup         | Low            | One-time API call per domain                             |

### Estimated scope
- **Backend:** ~8-12 new files (service, config, controller, routes, migration, types)
- **Frontend:** ~4-6 new component files + modifications to domain detail page and admin opensrs page
