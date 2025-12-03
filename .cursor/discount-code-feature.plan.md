<!-- 1ff6bad6-c3c7-4a1d-9b28-59a1d6f0410e 9ca405ac-c936-4fe6-a8d4-ec0310a01a34 -->
# Discount Code Feature Implementation

## Architecture

Use **Stripe's native Promotion Codes** (backed by Coupons). Stripe handles discount calculation; we sync metadata to Supabase for admin UI and audit logging.

**Key Files:**

- `app/checkout/page.tsx` - Add discount code input
- `app/admin/discounts/page.tsx` - New admin page
- `lib/api-client.ts` - Add discount API methods
- `supabase/migrations/` - New migration for discount tracking

---

## Phase 1: Database Schema

Create migration to track promotion codes and usage:

```sql
-- promotion_codes table (synced from Stripe)
CREATE TABLE promotion_codes (
  id UUID PRIMARY KEY,
  stripe_promotion_code_id TEXT UNIQUE NOT NULL,
  stripe_coupon_id TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT CHECK (discount_type IN ('percent_off', 'amount_off')),
  discount_value NUMERIC NOT NULL,
  max_redemptions INTEGER,
  times_redeemed INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Usage tracking for audit
CREATE TABLE discount_redemptions (
  id UUID PRIMARY KEY,
  promotion_code_id UUID REFERENCES promotion_codes(id),
  org_id UUID REFERENCES organizations(id),
  subscription_id UUID REFERENCES subscriptions(id),
  amount_discounted NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Phase 2: Backend API (Separate Repo)

**New Endpoints:**

| Endpoint | Method | Description |

|----------|--------|-------------|

| `/api/discounts/validate` | POST | Validate code via Stripe API |

| `/api/discounts` | GET | List all promotion codes (admin) |

| `/api/discounts` | POST | Create promotion code in Stripe + sync to DB |

| `/api/discounts/:id` | DELETE | Deactivate promotion code |

**Modify Existing:**

- `POST /api/stripe/subscriptions` - Accept optional `promotion_code` parameter, apply to Stripe subscription creation

**Backend Implementation Notes:**

- Use `stripe.promotionCodes.list()` and `stripe.promotionCodes.create()`
- Validate codes with `stripe.promotionCodes.list({ code: 'CODE', active: true })`
- Pass `promotion_code` to `stripe.subscriptions.create()` for automatic discount application

---

## Phase 3: Frontend - Checkout Page

Modify `app/checkout/page.tsx`:

1. Add state for discount code input and validation status
2. Add discount code input field with "Apply" button in Order Summary section
3. Call `/api/discounts/validate` on apply
4. Display discount breakdown (original price, discount, final price)
5. Pass validated `promotion_code` to `stripeApi.createSubscription()`

Update `lib/api-client.ts`:

- Add `discountsApi.validate(code)` method
- Modify `stripeApi.createSubscription()` to accept optional `promotionCode` parameter

---

## Phase 4: Admin UI

Create `app/admin/discounts/page.tsx`:

1. List all promotion codes with columns: Code, Type, Value, Redemptions, Expires, Status
2. "Create Code" modal with fields:

   - Code (text input)
   - Discount type (percent/amount dropdown)
   - Discount value (number input)
   - Max redemptions (optional)
   - Expiration date (optional date picker)

3. Deactivate button for each code
4. Filter by active/inactive status

Add navigation link in `components/admin/AdminLayout.tsx`.

---

## Files to Modify (Frontend Repo)

| File | Changes |

|------|---------|

| `app/checkout/page.tsx` | Add discount code input, validation, display |

| `app/admin/discounts/page.tsx` | New file - admin management UI |

| `lib/api-client.ts` | Add discounts API methods |

| `components/admin/AdminLayout.tsx` | Add nav link to discounts page |

| `supabase/migrations/YYYYMMDD_add_discount_codes.sql` | New schema |

## Backend Notes (Separate Repo)

- Create discount controller with CRUD operations
- Add Stripe promotion code integration
- Modify subscription creation to accept promotion codes
- Add webhook handler for promotion code redemption events (optional)

### To-dos

- [ ] Create Supabase migration for promotion_codes and discount_redemptions tables
- [ ] Add discountsApi methods and update stripeApi.createSubscription signature
- [ ] Add discount code input field and validation to checkout page
- [ ] Create admin discounts management page with list and create functionality
- [ ] Add Discounts link to admin navigation
- [ ] Document backend API changes needed for separate repo implementation