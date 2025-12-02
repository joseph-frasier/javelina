# Discount Codes Backend Implementation Guide

This document outlines the backend API changes required to support the discount code feature. The backend uses Stripe's native Promotion Codes system.

## Overview

The discount code feature uses Stripe's Coupon and Promotion Code APIs:
- **Coupons**: Define the discount (e.g., 20% off, $10 off)
- **Promotion Codes**: Customer-facing codes that reference coupons

The frontend syncs promotion code data to Supabase for admin UI and audit tracking.

---

## Database Schema

The following tables have been created in Supabase (migration: `20251202000000_add_discount_codes.sql`):

### `promotion_codes` table
Synced from Stripe, used for admin display and validation caching.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| stripe_promotion_code_id | TEXT | Stripe promo code ID (e.g., `promo_xxx`) |
| stripe_coupon_id | TEXT | Stripe coupon ID (e.g., `coup_xxx`) |
| code | TEXT | Customer-facing code (e.g., `SAVE20`) |
| discount_type | TEXT | `percent_off` or `amount_off` |
| discount_value | NUMERIC | Percentage (0-100) or cents amount |
| currency | TEXT | Currency code (default: `usd`) |
| max_redemptions | INTEGER | Max uses (NULL = unlimited) |
| times_redeemed | INTEGER | Current redemption count |
| first_time_transaction_only | BOOLEAN | Only for first purchases |
| applies_to_plans | TEXT[] | NULL = all plans, or array of plan codes |
| expires_at | TIMESTAMPTZ | Expiration date (NULL = never) |
| is_active | BOOLEAN | Whether code is usable |
| metadata | JSONB | Additional data |
| created_by | UUID | Admin who created the code |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

### `discount_redemptions` table
Tracks when codes are redeemed for audit purposes.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| promotion_code_id | UUID | Reference to promotion_codes |
| org_id | UUID | Organization that used the code |
| subscription_id | UUID | Subscription created with discount |
| user_id | UUID | User who applied the code |
| stripe_invoice_id | TEXT | Stripe invoice ID |
| amount_discounted | NUMERIC | Amount saved |
| original_amount | NUMERIC | Price before discount |
| final_amount | NUMERIC | Price after discount |
| created_at | TIMESTAMPTZ | Redemption timestamp |

---

## API Endpoints

### 1. Validate Promotion Code

Validates a promotion code before checkout.

```
POST /api/discounts/validate
```

**Request Body:**
```json
{
  "code": "SAVE20",
  "plan_code": "pro_lifetime"  // Optional: validates against plan restrictions
}
```

**Response (Success):**
```json
{
  "valid": true,
  "promotion_code_id": "uuid",
  "stripe_promotion_code_id": "promo_xxx",
  "discount_type": "percent_off",
  "discount_value": 20,
  "code": "SAVE20",
  "message": "Valid promotion code"
}
```

**Response (Invalid):**
```json
{
  "valid": false,
  "message": "This promotion code has expired"
}
```

**Implementation Notes:**
1. First check local database cache for quick validation
2. If not in cache or needs fresh data, call Stripe API:
   ```javascript
   const promoCodes = await stripe.promotionCodes.list({
     code: 'SAVE20',
     active: true,
     limit: 1
   });
   ```
3. Validate expiration, redemption limits, and plan restrictions
4. Return discount details for frontend display

---

### 2. List Promotion Codes (Admin)

Lists all promotion codes for admin management.

```
GET /api/discounts?active_only=true&page=1&limit=25
```

**Query Parameters:**
- `active_only`: boolean - Filter to active codes only
- `page`: number - Page number (default: 1)
- `limit`: number - Items per page (default: 25)

**Response:**
```json
{
  "promotion_codes": [
    {
      "id": "uuid",
      "stripe_promotion_code_id": "promo_xxx",
      "stripe_coupon_id": "coup_xxx",
      "code": "SAVE20",
      "discount_type": "percent_off",
      "discount_value": 20,
      "max_redemptions": 100,
      "times_redeemed": 15,
      "expires_at": "2025-12-31T23:59:59Z",
      "is_active": true,
      "created_at": "2025-12-01T00:00:00Z"
    }
  ],
  "total": 10,
  "page": 1,
  "limit": 25
}
```

**Implementation Notes:**
- Query the `promotion_codes` table
- Admin authentication required (superuser role check)

---

### 3. Create Promotion Code (Admin)

Creates a new promotion code in Stripe and syncs to database.

```
POST /api/discounts
```

**Request Body:**
```json
{
  "code": "NEWYEAR25",
  "discount_type": "percent_off",
  "discount_value": 25,
  "max_redemptions": 100,
  "expires_at": "2025-12-31T23:59:59Z",
  "first_time_transaction_only": true
}
```

**Implementation:**

```javascript
// 1. Create Stripe Coupon
const coupon = await stripe.coupons.create({
  percent_off: discount_type === 'percent_off' ? discount_value : undefined,
  amount_off: discount_type === 'amount_off' ? discount_value : undefined,
  currency: 'usd',
  duration: 'once',  // For first-time purchase discounts
  name: `Promo: ${code}`
});

// 2. Create Stripe Promotion Code
const promoCode = await stripe.promotionCodes.create({
  coupon: coupon.id,
  code: code,
  max_redemptions: max_redemptions || undefined,
  expires_at: expires_at ? Math.floor(new Date(expires_at).getTime() / 1000) : undefined,
  restrictions: {
    first_time_transaction: first_time_transaction_only
  }
});

// 3. Sync to Supabase
await supabase.from('promotion_codes').insert({
  stripe_promotion_code_id: promoCode.id,
  stripe_coupon_id: coupon.id,
  code: code.toUpperCase(),
  discount_type: discount_type,
  discount_value: discount_value,
  max_redemptions: max_redemptions,
  expires_at: expires_at,
  first_time_transaction_only: first_time_transaction_only,
  is_active: true,
  created_by: user.id
});
```

---

### 4. Deactivate Promotion Code (Admin)

Deactivates a promotion code in Stripe and database.

```
DELETE /api/discounts/:id
```

**Implementation:**

```javascript
// 1. Get the promotion code from database
const { data: promoCode } = await supabase
  .from('promotion_codes')
  .select('*')
  .eq('id', id)
  .single();

// 2. Deactivate in Stripe
await stripe.promotionCodes.update(promoCode.stripe_promotion_code_id, {
  active: false
});

// 3. Update database
await supabase
  .from('promotion_codes')
  .update({ is_active: false })
  .eq('id', id);

return { success: true };
```

---

### 5. Get Redemption History (Admin)

Returns redemption history for audit purposes.

```
GET /api/discounts/redemptions?promotion_code_id=uuid&page=1&limit=25
```

**Response:**
```json
{
  "redemptions": [
    {
      "id": "uuid",
      "promotion_code_id": "uuid",
      "org_id": "uuid",
      "organization_name": "Acme Corp",
      "amount_discounted": 10.00,
      "original_amount": 49.95,
      "final_amount": 39.95,
      "created_at": "2025-12-01T12:00:00Z",
      "promotion_code": {
        "code": "SAVE20",
        "discount_type": "percent_off",
        "discount_value": 20
      }
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 25
}
```

---

## Modifying Subscription Creation

Update the existing `POST /api/stripe/subscriptions` endpoint to accept an optional `promotion_code` parameter.

**Updated Request Body:**
```json
{
  "org_id": "uuid",
  "plan_code": "pro_lifetime",
  "price_id": "price_xxx",
  "promotion_code": "promo_xxx"  // Optional: Stripe promotion code ID
}
```

**Implementation Update:**

```javascript
// When creating the subscription
const subscriptionParams = {
  customer: stripeCustomerId,
  items: [{ price: priceId }],
  payment_behavior: 'default_incomplete',
  payment_settings: { save_default_payment_method: 'on_subscription' },
  expand: ['latest_invoice.payment_intent']
};

// Add promotion code if provided
if (promotion_code) {
  subscriptionParams.promotion_code = promotion_code;
}

const subscription = await stripe.subscriptions.create(subscriptionParams);
```

**After Successful Payment (Webhook):**

When the subscription is activated, record the redemption:

```javascript
// In checkout.session.completed or invoice.paid webhook handler
if (session.discount) {
  const promoCodeId = session.discount.promotion_code;
  
  // Look up our local promotion_codes record
  const { data: localPromo } = await supabase
    .from('promotion_codes')
    .select('*')
    .eq('stripe_promotion_code_id', promoCodeId)
    .single();
  
  if (localPromo) {
    // Record the redemption
    await supabase.from('discount_redemptions').insert({
      promotion_code_id: localPromo.id,
      org_id: orgId,
      subscription_id: subscriptionId,
      user_id: userId,
      stripe_invoice_id: session.invoice,
      amount_discounted: session.total_details.amount_discount / 100,
      original_amount: (session.amount_subtotal) / 100,
      final_amount: session.amount_total / 100
    });
    
    // Increment redemption count
    await supabase.rpc('increment_promotion_code_redemption', {
      promo_code_id: localPromo.id
    });
  }
}
```

---

## Stripe Webhook Events

Consider handling these webhook events:

| Event | Action |
|-------|--------|
| `coupon.created` | Sync new coupons (optional) |
| `coupon.deleted` | Mark related promo codes inactive |
| `promotion_code.created` | Sync if created in Stripe Dashboard |
| `promotion_code.updated` | Update local cache |
| `invoice.paid` | Record redemption, increment count |

---

## Security Considerations

1. **Admin-only endpoints**: `/api/discounts` (list, create, delete) require superuser role
2. **Validation endpoint**: `/api/discounts/validate` is public but rate-limited
3. **Stripe API keys**: Keep secret key secure, never expose to frontend
4. **Code uniqueness**: Stripe enforces unique codes per account
5. **RLS policies**: Database has RLS to restrict access appropriately

---

## Testing

1. Create a test coupon and promotion code in Stripe Dashboard
2. Test validation endpoint with valid/invalid/expired codes
3. Complete a checkout with a promotion code applied
4. Verify redemption is recorded in database
5. Test admin UI for creating/deactivating codes

---

## Migration Checklist

- [x] Database migration applied (`20251202000000_add_discount_codes.sql`)
- [ ] Backend endpoints implemented
- [ ] Stripe webhook handlers updated
- [ ] Admin authentication middleware applied to protected routes
- [ ] Rate limiting added to validation endpoint
- [ ] Integration testing completed

