# Subscription Testing Guide

This guide provides step-by-step instructions for testing both lifetime and monthly subscription plans.

## Prerequisites

- Dev environment running (`npm run dev`)
- Dev branch database connected (ipfsrbxjgewhdcvonrbo.supabase.co)
- Stripe test mode enabled
- Test credit cards available

## Test Credit Cards (Stripe Test Mode)

- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **3D Secure**: `4000 0025 0000 3155`
- Use any future expiry date (e.g., 12/25)
- Use any 3-digit CVC (e.g., 123)

---

## Test Suite 1: Monthly Subscription Plans

### Test 1.1: Subscribe to Starter Monthly ($9.95/month)

**Steps:**
1. Navigate to `/pricing`
2. Verify "Monthly Subscriptions" section is visible
3. Click "Select Plan" on Starter card (should show $9.95/month)
4. Create new organization (e.g., "Test Starter Org")
5. Complete checkout with test card `4242 4242 4242 4242`
6. Verify redirect to success page
7. Navigate to Settings > Billing
8. Verify subscription shows:
   - Plan: "Starter"
   - Price: "$9.95/month"
   - Status: "ACTIVE"
   - "Change Plan" button visible

**Database Verification:**
```sql
SELECT 
  s.stripe_subscription_id,
  s.status,
  p.code,
  p.billing_interval,
  s.current_period_end
FROM subscriptions s
JOIN plans p ON s.plan_id = p.id
WHERE s.org_id = 'YOUR_ORG_ID';
```

**Expected:**
- `status = 'active'`
- `billing_interval = 'month'`
- `stripe_subscription_id` starts with 'sub_'
- `current_period_end` is ~30 days from now

---

### Test 1.2: Subscribe to Pro Monthly ($49.95/month)

**Steps:**
1. Navigate to `/pricing`
2. Click "Select Plan" on Pro card (should show $49.95/month)
3. Create new organization (e.g., "Test Pro Org")
4. Complete checkout with test card
5. Verify subscription is active

---

### Test 1.3: Subscribe to Business Monthly ($199.95/month)

**Steps:**
1. Navigate to `/pricing`
2. Click "Select Plan" on Business card (should show $199.95/month)
3. Create new organization (e.g., "Test Business Org")
4. Complete checkout with test card
5. Verify subscription is active

---

## Test Suite 2: Upgrade/Downgrade Subscriptions

### Test 2.1: Upgrade from Starter to Pro

**Steps:**
1. Use organization with Starter Monthly plan
2. Navigate to Settings > Billing
3. Click "Change Plan" button
4. Select "Pro" plan ($49.95/month)
5. Click "Confirm Change"
6. Verify success toast appears
7. Verify subscription updates to:
   - Plan: "Pro"
   - Price: "$49.95/month"

**Stripe Dashboard Check:**
- Open Stripe Dashboard > Subscriptions
- Find the subscription
- Verify plan changed to Pro
- Verify prorated invoice created

---

### Test 2.2: Downgrade from Business to Pro

**Steps:**
1. Use organization with Business Monthly plan
2. Navigate to Settings > Billing
3. Click "Change Plan" button
4. Select "Pro" plan
5. Click "Confirm Change"
6. Verify subscription updates

**Expected:**
- Prorated credit applied
- Next invoice adjusted
- Plan immediately changes

---

### Test 2.3: Upgrade from Pro to Business

**Steps:**
1. Use organization with Pro Monthly plan
2. Navigate to Settings > Billing
3. Click "Change Plan" button
4. Select "Business" plan
5. Click "Confirm Change"
6. Verify prorated charge created

---

## Test Suite 3: Lifetime Plans (Regression Tests)

### Test 3.1: Purchase Starter Lifetime ($238.80)

**Steps:**
1. Navigate to `/pricing`
2. Verify "Lifetime Plans" section is visible
3. Click "Select Plan" on Starter Lifetime card
4. Create new organization (e.g., "Test Starter Lifetime Org")
5. Complete checkout with test card
6. Verify redirect to success page
7. Navigate to Settings > Billing
8. Verify subscription shows:
   - Plan: "Starter Lifetime"
   - Price: "$238.80 ONE-TIME"
   - Status: "ACTIVE" or "LIFETIME"
   - Blue message: "You have a lifetime subscription"
   - NO "Change Plan" button

**Database Verification:**
```sql
SELECT 
  s.stripe_subscription_id,
  s.status,
  p.code,
  p.billing_interval,
  s.current_period_end
FROM subscriptions s
JOIN plans p ON s.plan_id = p.id
WHERE s.org_id = 'YOUR_ORG_ID';
```

**Expected:**
- `status = 'lifetime'`
- `billing_interval = null`
- `stripe_subscription_id` starts with 'pi_' (PaymentIntent)
- `current_period_end = null`

---

### Test 3.2: Purchase Pro Lifetime ($1,198.80)

**Steps:**
1. Navigate to `/pricing`
2. Click "Select Plan" on Pro Lifetime card
3. Create new organization
4. Complete checkout
5. Verify lifetime status

---

### Test 3.3: Purchase Business Lifetime ($4,776.00)

**Steps:**
1. Navigate to `/pricing`
2. Click "Select Plan" on Business Lifetime card (formerly "Premium Lifetime")
3. Create new organization
4. Complete checkout
5. Verify lifetime status

---

## Test Suite 4: Enterprise Plans

### Test 4.1: Enterprise Lifetime (Contact Sales)

**Steps:**
1. Navigate to `/pricing`
2. Find "Enterprise Lifetime" at bottom
3. Click "Contact Us" button
4. Verify toast: "Please contact our sales team for Enterprise pricing"
5. Verify NO redirect to checkout

---

### Test 4.2: Enterprise Monthly (Contact Sales)

**Steps:**
1. Navigate to `/pricing`
2. Verify Enterprise appears in both sections OR only in one
3. Click button
4. Verify contact sales message

---

## Test Suite 5: UI/UX Tests

### Test 5.1: Pricing Page Layout

**Verify:**
- ✅ Two distinct sections: "Lifetime Plans" and "Monthly Subscriptions"
- ✅ Each section has descriptive subtitle
- ✅ Lifetime plans show "ONE-TIME" label
- ✅ Monthly plans show "/month" label
- ✅ Pro plan marked as "Most Popular"
- ✅ Enterprise plan full-width at bottom
- ✅ All prices formatted correctly

---

### Test 5.2: Checkout Page

**Verify:**
- ✅ Plan name displays correctly
- ✅ Billing interval shows "lifetime" or "month"
- ✅ Price displays correctly
- ✅ Order summary accurate
- ✅ Stripe payment form loads
- ✅ Success/error handling works

---

### Test 5.3: Settings > Billing Page

**For Subscription Plans:**
- ✅ "Change Plan" button visible
- ✅ "Manage Billing" button visible
- ✅ "Cancel Subscription" button visible (if active)
- ✅ Next billing date shown
- ✅ Status badge correct color

**For Lifetime Plans:**
- ✅ NO "Change Plan" button
- ✅ Blue info box with contact sales message
- ✅ Price shows one-time amount
- ✅ NO billing date shown

---

### Test 5.4: Change Plan Modal

**Verify:**
- ✅ Only shows subscription plans (not lifetime)
- ✅ Excludes current plan
- ✅ Shows prices and features
- ✅ Highlights selected plan
- ✅ Proration message shown
- ✅ Confirm/Cancel buttons work
- ✅ Modal closes after success
- ✅ Subscription data refreshes

---

## Test Suite 6: Edge Cases

### Test 6.1: Failed Payment

**Steps:**
1. Start subscription checkout
2. Use declined card: `4000 0000 0000 0002`
3. Verify error message shown
4. Verify subscription not created

---

### Test 6.2: Canceled Payment

**Steps:**
1. Start subscription checkout
2. Close browser/tab before payment
3. Return to pricing page
4. Verify can restart checkout

---

### Test 6.3: Multiple Organizations

**Steps:**
1. Create 3 organizations with different plans:
   - Org 1: Starter Monthly
   - Org 2: Pro Lifetime
   - Org 3: Business Monthly
2. Switch between organizations
3. Verify Settings > Billing shows correct plan for each
4. Verify change plan only available for subscription orgs

---

### Test 6.4: Plan Not Found

**Steps:**
1. In database, deactivate a plan: `UPDATE plans SET is_active = false WHERE code = 'starter'`
2. Try to create subscription with that plan
3. Verify graceful error handling
4. Re-activate plan: `UPDATE plans SET is_active = true WHERE code = 'starter'`

---

## Test Suite 7: Webhook Testing

### Test 7.1: Subscription Created Webhook

**Steps:**
1. Use Stripe CLI: `stripe listen --forward-to localhost:3001/api/stripe/webhooks`
2. Create new subscription via UI
3. Watch webhook events in terminal
4. Verify `customer.subscription.created` event received
5. Verify subscription record created in database

---

### Test 7.2: Subscription Updated Webhook

**Steps:**
1. Change plan via UI
2. Watch webhook events
3. Verify `customer.subscription.updated` event received
4. Verify database record updated with new plan_id

---

### Test 7.3: Invoice Payment Succeeded

**Steps:**
1. Complete successful payment
2. Verify `invoice.payment_succeeded` event received
3. Verify subscription status updated to 'active'

---

## Database Queries for Verification

### Check All Plans
```sql
SELECT 
  code, 
  name, 
  billing_interval,
  metadata->>'price' as price,
  metadata->>'price_id' as price_id,
  is_active
FROM plans 
ORDER BY 
  CASE 
    WHEN billing_interval IS NULL THEN 0 
    ELSE 1 
  END,
  code;
```

### Check Recent Subscriptions
```sql
SELECT 
  o.name as org_name,
  s.stripe_subscription_id,
  s.status,
  p.code as plan_code,
  p.billing_interval,
  s.current_period_end,
  s.created_at
FROM subscriptions s
JOIN organizations o ON s.org_id = o.id
JOIN plans p ON s.plan_id = p.id
ORDER BY s.created_at DESC
LIMIT 10;
```

### Check Subscription by Organization
```sql
SELECT 
  s.*,
  p.code,
  p.name,
  p.billing_interval
FROM subscriptions s
JOIN plans p ON s.plan_id = p.id
WHERE s.org_id = 'YOUR_ORG_ID';
```

---

## Success Criteria

### Frontend
- [ ] Pricing page displays both plan types in separate sections
- [ ] All prices and features display correctly
- [ ] Checkout flow works for both plan types
- [ ] Settings page shows correct subscription details
- [ ] Change plan modal only appears for subscription plans
- [ ] Upgrade/downgrade works correctly

### Backend
- [ ] Subscription creation works for monthly plans
- [ ] Lifetime checkout still works (no regression)
- [ ] Plan changes are processed correctly
- [ ] Webhooks update database correctly
- [ ] Price ID lookup works for all plans

### Database
- [ ] 8 active plans total (4 lifetime + 3 subscription + 1 enterprise)
- [ ] All plans have correct price_id in metadata
- [ ] Subscriptions have correct status and billing_interval
- [ ] No orphaned or duplicate records

---

## Rollback Plan

If issues are found:

1. **Frontend only**: Revert changed files
   ```bash
   git checkout HEAD -- lib/plans-config.ts app/pricing/page.tsx components/billing/SubscriptionManager.tsx components/modals/ChangePlanModal.tsx
   ```

2. **Database**: Remove new plans
   ```sql
   DELETE FROM plans WHERE code IN ('starter', 'pro', 'business', 'enterprise');
   UPDATE plans SET name = 'Premium Lifetime' WHERE code = 'premium_lifetime';
   ```

3. **Full rollback**: Cherry-pick only lifetime plan commits

---

## Post-Testing Checklist

- [ ] All test suites pass
- [ ] No console errors in browser
- [ ] No errors in backend logs
- [ ] Stripe Dashboard shows correct subscriptions
- [ ] Database records are accurate
- [ ] Documentation updated
- [ ] Backend verification checklist completed
- [ ] Ready to merge to main branch

