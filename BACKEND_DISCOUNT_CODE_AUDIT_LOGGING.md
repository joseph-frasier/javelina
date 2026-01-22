# Backend Discount Code Audit Logging Implementation

## Overview

This document specifies how to implement audit logging for discount code admin actions in the Express backend API. Discount code actions must be logged to the existing `audit_logs` table with `actor_type='admin'` and `admin_user_id` set to differentiate them from regular user actions.

**IMPORTANT:** The `GET /admin/audit-logs` endpoint already supports filtering by `table_name` query parameter. The frontend can pass `?table_name=promotion_codes` to only fetch discount code actions.

---

## Discount Code Actions Requiring Audit Logging

1. **Create Discount Code** - `POST /api/discounts`
2. **Deactivate Discount Code** - `DELETE /api/discounts/:id`

---

## Audit Log Table Structure

The existing `audit_logs` table supports discount code admin actions with these fields:

| Field | Type | Description | Discount Code Action Value |
|-------|------|-------------|---------------------------|
| `id` | UUID | Primary key | Auto-generated |
| `table_name` | TEXT | Table being modified | **'promotion_codes'** |
| `record_id` | UUID | ID of affected resource | Promotion code UUID |
| `action` | TEXT | Action type | 'INSERT' (create) or 'UPDATE' (deactivate) |
| `old_data` | JSONB | Previous state | `{}` for create, `{ is_active: true }` for deactivate |
| `new_data` | JSONB | New state | `{ code: "SAVE20", is_active: true }` for create, `{ is_active: false }` for deactivate |
| `user_id` | UUID | Regular user (for user actions) | **NULL** for admin actions |
| `admin_user_id` | UUID | **Admin who performed action** | **Admin's user ID from JWT** |
| `actor_type` | TEXT | Actor type | **'admin'** |
| `metadata` | JSONB | Additional context | `{ code: "SAVE20" }` (discount code name for display) |
| `ip_address` | INET | IP address | NULL (optional enhancement) |
| `user_agent` | TEXT | User agent | NULL (optional enhancement) |
| `created_at` | TIMESTAMPTZ | Timestamp | Auto-generated |

**Key Points:**
- `actor_type = 'admin'` distinguishes admin actions from regular user actions
- `admin_user_id` contains the admin's user ID (from JWT token)
- `user_id` is NULL for admin actions (we use `admin_user_id` instead)
- `metadata.code` should contain the discount code name for human-readable display
- Keep `old_data` and `new_data` simple - just the changed fields

---

## Implementation

### 1. Reusable Helper Function

Use the existing `logAdminAction()` helper function from `utils/audit-logging.js`:

```javascript
const { supabase } = require('./supabase');

/**
 * Log an admin action to the audit_logs table
 * 
 * @param {Object} params
 * @param {string} params.adminUserId - ID of admin performing action (from JWT)
 * @param {string} params.tableName - Table being modified ('promotion_codes')
 * @param {string} params.recordId - ID of record being modified (promo code UUID)
 * @param {string} params.action - Action type ('INSERT', 'UPDATE', etc.)
 * @param {Object} params.oldData - Previous state (only changed fields)
 * @param {Object} params.newData - New state (only changed fields)
 * @param {Object} params.metadata - Additional context (e.g., { code: "SAVE20" })
 * @returns {Promise<void>}
 */
async function logAdminAction({
  adminUserId,
  tableName,
  recordId,
  action,
  oldData,
  newData,
  metadata = {}
}) {
  try {
    const { error } = await supabase
      .from('audit_logs')
      .insert({
        table_name: tableName,
        record_id: recordId,
        action: action,
        old_data: oldData,
        new_data: newData,
        user_id: null,  // Always null for admin actions
        admin_user_id: adminUserId,
        actor_type: 'admin',
        metadata: metadata,
        created_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('Failed to log admin action:', error);
      // Don't throw - audit logging failure should not block the action
    }
  } catch (err) {
    console.error('Exception while logging admin action:', err);
    // Don't throw - audit logging failure should not block the action
  }
}

module.exports = { logAdminAction };
```

**Important:** Audit logging failures should be logged but should NOT cause the admin action to fail.

---

### 2. Updated Endpoint Implementations

#### A. Create Discount Code - `POST /api/discounts`

```javascript
const { supabaseAdmin } = require('../utils/supabase-admin');
const { supabase } = require('../utils/supabase');
const { logAdminAction } = require('../utils/audit-logging');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

router.post('/api/discounts', 
  authenticateUser, 
  verifyAdmin, 
  async (req, res) => {
    try {
      const adminId = req.user.id;  // From JWT token
      const {
        code,
        discount_type,
        discount_value,
        max_redemptions,
        expires_at,
        first_time_transaction_only
      } = req.body;
      
      // Validate input
      if (!code || !discount_type || !discount_value) {
        return res.status(400).json({ 
          error: 'Missing required fields: code, discount_type, discount_value' 
        });
      }
      
      const codeUpper = code.toUpperCase();
      
      // 1. Create Stripe Coupon
      const couponParams = {
        duration: 'once',
        name: `Promo: ${codeUpper}`
      };
      
      if (discount_type === 'percent_off') {
        couponParams.percent_off = discount_value;
      } else if (discount_type === 'amount_off') {
        couponParams.amount_off = discount_value;
        couponParams.currency = 'usd';
      } else {
        return res.status(400).json({ 
          error: 'discount_type must be "percent_off" or "amount_off"' 
        });
      }
      
      const coupon = await stripe.coupons.create(couponParams);
      
      // 2. Create Stripe Promotion Code
      const promoParams = {
        coupon: coupon.id,
        code: codeUpper
      };
      
      if (max_redemptions) {
        promoParams.max_redemptions = max_redemptions;
      }
      
      if (expires_at) {
        promoParams.expires_at = Math.floor(new Date(expires_at).getTime() / 1000);
      }
      
      if (first_time_transaction_only) {
        promoParams.restrictions = {
          first_time_transaction: true
        };
      }
      
      const promoCode = await stripe.promotionCodes.create(promoParams);
      
      // 3. Sync to Supabase
      const { data: newPromoCode, error: insertError } = await supabase
        .from('promotion_codes')
        .insert({
          stripe_promotion_code_id: promoCode.id,
          stripe_coupon_id: coupon.id,
          code: codeUpper,
          discount_type: discount_type,
          discount_value: discount_value,
          max_redemptions: max_redemptions || null,
          expires_at: expires_at || null,
          first_time_transaction_only: first_time_transaction_only || false,
          is_active: true,
          created_by: adminId
        })
        .select()
        .single();
      
      if (insertError) {
        console.error('Failed to sync promo code to database:', insertError);
        return res.status(500).json({ 
          error: 'Failed to create discount code in database' 
        });
      }
      
      // 4. Log admin action
      await logAdminAction({
        adminUserId: adminId,
        tableName: 'promotion_codes',
        recordId: newPromoCode.id,
        action: 'INSERT',
        oldData: {},
        newData: { 
          code: codeUpper, 
          is_active: true,
          discount_type: discount_type,
          discount_value: discount_value
        },
        metadata: { code: codeUpper }
      });
      
      res.json(newPromoCode);
    } catch (error) {
      console.error('Create discount code error:', error);
      
      // Handle Stripe errors
      if (error.type === 'StripeCardError' || error.type === 'StripeInvalidRequestError') {
        return res.status(400).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Failed to create discount code' });
    }
  }
);
```

---

#### B. Deactivate Discount Code - `DELETE /api/discounts/:id`

```javascript
router.delete('/api/discounts/:id', 
  authenticateUser, 
  verifyAdmin, 
  async (req, res) => {
    try {
      const { id } = req.params;
      const adminId = req.user.id;
      
      // 1. Get the promotion code from database
      const { data: promoCode, error: fetchError } = await supabase
        .from('promotion_codes')
        .select('*')
        .eq('id', id)
        .single();
      
      if (fetchError || !promoCode) {
        return res.status(404).json({ error: 'Discount code not found' });
      }
      
      if (!promoCode.is_active) {
        return res.status(400).json({ 
          error: 'Discount code is already deactivated' 
        });
      }
      
      // 2. Deactivate in Stripe
      try {
        await stripe.promotionCodes.update(promoCode.stripe_promotion_code_id, {
          active: false
        });
      } catch (stripeError) {
        console.error('Failed to deactivate promo code in Stripe:', stripeError);
        // Continue anyway - we'll deactivate in our database
      }
      
      // 3. Update database
      const { error: updateError } = await supabase
        .from('promotion_codes')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (updateError) {
        console.error('Failed to deactivate promo code in database:', updateError);
        return res.status(500).json({ 
          error: 'Failed to deactivate discount code' 
        });
      }
      
      // 4. Log admin action
      await logAdminAction({
        adminUserId: adminId,
        tableName: 'promotion_codes',
        recordId: id,
        action: 'UPDATE',
        oldData: { is_active: true },
        newData: { is_active: false },
        metadata: { code: promoCode.code }
      });
      
      res.json({ 
        success: true, 
        message: 'Discount code deactivated successfully' 
      });
    } catch (error) {
      console.error('Deactivate discount code error:', error);
      res.status(500).json({ error: 'Failed to deactivate discount code' });
    }
  }
);
```

---

## Pattern for Future Discount Code Actions

When adding new discount code admin actions, follow this pattern:

### Step 1: Authenticate & Authorize
```javascript
router.post('/api/discounts/action', authenticateUser, verifyAdmin, async (req, res) => {
  const adminId = req.user.id;  // Extract admin ID from JWT
```

### Step 2: Validate
```javascript
  // Fetch current state of resource
  const { data: promoCode, error } = await supabase
    .from('promotion_codes')
    .select('*')
    .eq('id', promoCodeId)
    .single();
  
  if (error || !promoCode) {
    return res.status(404).json({ error: 'Discount code not found' });
  }
  
  // Check if action is valid
  if (promoCode.is_active === desiredState) {
    return res.status(400).json({ error: 'Already in desired state' });
  }
```

### Step 3: Perform Action
```javascript
  // Update Stripe first (if needed)
  await stripe.promotionCodes.update(promoCode.stripe_promotion_code_id, {
    // ... updates
  });
  
  // Update the database
  const { error: updateError } = await supabase
    .from('promotion_codes')
    .update({ /* ... */ })
    .eq('id', promoCodeId);
  
  if (updateError) {
    throw updateError;
  }
```

### Step 4: Log Admin Action
```javascript
  // Log to audit_logs
  await logAdminAction({
    adminUserId: adminId,
    tableName: 'promotion_codes',
    recordId: promoCodeId,
    action: 'UPDATE',
    oldData: { /* previous state */ },
    newData: { /* new state */ },
    metadata: { code: promoCode.code }
  });
  
  res.json({ success: true, message: 'Action completed' });
});
```

---

## Middleware Requirements

Ensure the `verifyAdmin` middleware:

1. **Validates JWT token** from `Authorization: Bearer <token>` header
2. **Extracts user ID** from JWT and sets `req.user.id`
3. **Checks superadmin flag** by querying `profiles.superadmin = true`
4. **Returns 403** if user is not a superadmin

Example:
```javascript
async function verifyAdmin(req, res, next) {
  try {
    const userId = req.user.id;  // Set by authenticateUser middleware
    
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('superadmin')
      .eq('id', userId)
      .single();
    
    if (error || !profile || !profile.superadmin) {
      return res.status(403).json({ 
        error: 'Forbidden: Superadmin access required' 
      });
    }
    
    next();
  } catch (error) {
    console.error('Admin verification error:', error);
    res.status(500).json({ error: 'Failed to verify admin status' });
  }
}
```

---

## Testing Checklist

After implementing the changes, test each endpoint:

### 1. Create Discount Code
- [ ] Call `POST /api/discounts` with valid data
- [ ] Verify response contains discount code details
- [ ] Check Stripe Dashboard: coupon and promotion code created
- [ ] Check database: `promotion_codes` table has new row
- [ ] Check audit_logs table:
  ```sql
  SELECT * FROM audit_logs 
  WHERE actor_type = 'admin' 
  AND table_name = 'promotion_codes' 
  AND action = 'INSERT'
  ORDER BY created_at DESC LIMIT 1;
  ```
- [ ] Verify fields: `admin_user_id` set, `user_id` is NULL, `actor_type = 'admin'`
- [ ] Verify `metadata.code` contains discount code name
- [ ] Verify `new_data` contains code and is_active

### 2. Deactivate Discount Code
- [ ] Call `DELETE /api/discounts/:id`
- [ ] Verify response: `{ success: true, message: '...' }`
- [ ] Check Stripe Dashboard: promotion code is deactivated
- [ ] Check database: `promotion_codes.is_active = false`
- [ ] Check audit_logs table:
  ```sql
  SELECT * FROM audit_logs 
  WHERE actor_type = 'admin' 
  AND table_name = 'promotion_codes' 
  AND action = 'UPDATE'
  ORDER BY created_at DESC LIMIT 1;
  ```
- [ ] Verify `old_data = { is_active: true }` and `new_data = { is_active: false }`
- [ ] Verify `metadata.code` contains discount code name

### 3. Audit Logs Display in Admin Panel
- [ ] Navigate to frontend admin panel → Audit Logs
- [ ] Filter by table: "promotion_codes" (or view all)
- [ ] Verify discount code creation actions appear with admin name and code name
- [ ] Verify discount code deactivation actions appear
- [ ] Verify formatting: "Admin X created discount code SAVE20"
- [ ] Verify formatting: "Admin X deactivated discount code SAVE20"

### 4. Query Audit Logs Directly
```sql
-- View all discount code admin actions
SELECT 
  al.created_at,
  al.action,
  al.table_name,
  al.record_id,
  al.old_data,
  al.new_data,
  al.metadata,
  p.name as admin_name,
  p.email as admin_email
FROM audit_logs al
LEFT JOIN profiles p ON al.admin_user_id = p.id
WHERE al.actor_type = 'admin'
  AND al.table_name = 'promotion_codes'
ORDER BY al.created_at DESC;
```

---

## Frontend Display Format

The frontend will display discount code audit logs in a clear, human-readable format:

**List View (Collapsed):**
```
Seth Chesky created discount code SAVE20
promotion_codes • 4 minutes ago
```

**Deactivation:**
```
Seth Chesky deactivated discount code SAVE20
promotion_codes • 2 minutes ago
```

**Expanded Detail View (Create):**
```
Admin: Seth Chesky (seth@example.com)
Action: created discount code
Discount Code: SAVE20
Details: 
  - Type: percent_off
  - Value: 20%
  - Status: active

Technical Details:
- Record ID: 2c7f7631-0e2b-4446-865b-c18f96921ab8
- Table: promotion_codes
- Timestamp: Jan 20, 2026 at 3:45 PM
```

**Expanded Detail View (Deactivate):**
```
Admin: Seth Chesky (seth@example.com)
Action: deactivated discount code
Discount Code: SAVE20
Changes: Status changed from active to inactive

Technical Details:
- Record ID: 2c7f7631-0e2b-4446-865b-c18f96921ab8
- Table: promotion_codes
- Timestamp: Jan 20, 2026 at 3:50 PM
```

**Required Fields in API Response:**
- `metadata.code` - Name of the discount code
- `old_data` - Previous state (used to interpret action)
- `new_data` - New state (used to interpret action)
- `profiles.name` - Admin's name
- `profiles.email` - Admin's email

Without these fields, the frontend cannot display "Admin X created discount code Y" and will fall back to generic "INSERT • promotion_codes" display.

---

## Summary

**What to Implement:**

1. ✅ Update `POST /api/discounts` endpoint to call `logAdminAction()` after creation
2. ✅ Update `DELETE /api/discounts/:id` endpoint to call `logAdminAction()` after deactivation
3. ✅ Use `logAdminAction()` helper function (same pattern as user/org actions)
4. ✅ Set `table_name = 'promotion_codes'`
5. ✅ Set `action = 'INSERT'` for create, `'UPDATE'` for deactivate
6. ✅ Include discount code name in `metadata.code` for human-readable display
7. ✅ Ensure middleware sets `req.user.id` from JWT

**Key Points:**
- Use `admin_user_id` field for admin actions
- Set `actor_type = 'admin'`
- Keep `user_id = NULL` for admin actions
- Include discount code name in metadata for frontend display
- Basic logging: old/new state of changed fields
- Audit logging failures should not block the action
- Frontend already has all necessary API client methods in `lib/api-client.ts`

**Frontend Status:**
- ✅ API client methods exist (`discountsApi.create`, `discountsApi.deactivate`)
- ✅ Admin pages make correct API calls (`app/admin/discounts/page.tsx`)
- ✅ Audit log display exists (`app/admin/audit-logs/page.tsx`)
- ✅ No frontend changes needed

**Backend Requirements:**
- Implement audit logging in existing discount code endpoints
- Use existing `logAdminAction()` helper function
- Ensure admin user ID is extracted from JWT token
