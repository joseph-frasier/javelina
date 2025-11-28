# Lifetime Plan Upgrade Testing Guide

This document provides a comprehensive testing checklist for the lifetime plan upgrade feature.

## Prerequisites

Before testing, ensure:
- [x] Frontend changes deployed
- [ ] Backend API endpoints implemented and deployed
- [ ] Stripe test mode configured
- [ ] Test cards available (4242 4242 4242 4242)
- [ ] Test organizations with different plan types set up

---

## Test Scenarios

### 1. Monthly Subscription → Lifetime Upgrade

#### Test Case 1.1: Starter Monthly → Starter Lifetime

**Setup**:
1. Create organization with Starter Monthly plan
2. Let subscription run for 15 days (or use test clock in Stripe)

**Steps**:
1. Navigate to Settings > Billing
2. Click "Change Plan"
3. Select "Starter Lifetime" plan
4. Verify pricing breakdown shows:
   - Original lifetime price
   - Prorated credit from remaining days
   - Final price = lifetime price - credit
5. Click "Confirm Upgrade"
6. **Verify redirect to `/checkout` page** (not Stripe's hosted checkout)
7. Verify checkout page shows:
   - "Complete Your Upgrade" title
   - Upgrade Summary with pricing breakdown
   - Credit displayed in green
   - Lifetime benefits section
8. Complete payment with test card: 4242 4242 4242 4242
9. Wait for webhook processing and success redirect

**Expected Results**:
- ✅ Pricing calculation is accurate
- ✅ **Redirects to `/checkout` page** (consistent UX)
- ✅ Checkout shows upgrade-specific UI with pricing breakdown
- ✅ Payment succeeds using Stripe Elements
- ✅ Webhook updates subscription to lifetime status
- ✅ Monthly subscription canceled in Stripe
- ✅ User sees "Lifetime plan" badge
- ✅ Upgrade button available (to higher tiers)
- ✅ Database subscription record updated:
  - `status = 'lifetime'`
  - `stripe_subscription_id = null`
  - `plan_id` updated to lifetime plan
  - `metadata.upgrade_history` contains upgrade record

---

#### Test Case 1.2: Pro Monthly → Pro Lifetime

**Setup**:
1. Create organization with Pro Monthly plan ($49.95/month)
2. Let subscription run for 10 days

**Steps**:
1. Navigate to Settings > Billing
2. Click "Change Plan"
3. Select "Pro Lifetime" plan
4. Verify pricing calculation
5. Complete upgrade

**Expected Results**:
- ✅ Credit calculated for ~20 days remaining
- ✅ All upgrade steps successful
- ✅ Can still upgrade to Premium Lifetime

---

#### Test Case 1.3: Business Monthly → Business Lifetime

**Setup**:
1. Create organization with Business Monthly plan
2. Subscription just started (1 day old)

**Steps**:
1. Attempt upgrade to Business Lifetime
2. Verify maximum credit given (almost full month)

**Expected Results**:
- ✅ Credit is nearly equal to monthly price
- ✅ Final price is very small
- ✅ Upgrade completes successfully

---

### 2. Lifetime → Higher Lifetime Tier Upgrade

#### Test Case 2.1: Starter Lifetime → Pro Lifetime

**Setup**:
1. Create organization with Starter Lifetime plan

**Steps**:
1. Navigate to Settings > Billing
2. Click "Upgrade Plan"
3. Verify only higher tiers shown:
   - Pro Lifetime (available)
   - Premium Lifetime (available)
   - Starter Lifetime (current - grayed out)
4. Select "Pro Lifetime"
5. Verify pricing shows:
   - Pro Lifetime price: $1,198.80
   - Starter Lifetime credit: $238.80
   - Final price: $960.00
6. Complete upgrade

**Expected Results**:
- ✅ Price difference calculated correctly
- ✅ No time-based proration (already lifetime)
- ✅ Upgrade successful
- ✅ Database updated with new plan
- ✅ Upgrade history recorded in metadata

---

#### Test Case 2.2: Pro Lifetime → Premium Lifetime

**Setup**:
1. Create organization with Pro Lifetime plan

**Steps**:
1. Click "Upgrade Plan"
2. Verify available options:
   - Premium Lifetime (available)
   - Pro Lifetime (current - grayed out)
   - Starter Lifetime (not shown or grayed out - downgrade)
3. Select Premium Lifetime
4. Verify price difference
5. Complete upgrade

**Expected Results**:
- ✅ Only Premium available
- ✅ Downgrades not possible
- ✅ Upgrade successful

---

### 3. Invalid Upgrade Attempts (Should Fail)

#### Test Case 3.1: Lifetime → Monthly Downgrade (Not Allowed)

**Setup**:
1. Organization with any Lifetime plan

**Steps**:
1. Click "Upgrade Plan"
2. Verify monthly plans are NOT shown or are disabled

**Expected Results**:
- ✅ Monthly plans not available
- ✅ Cannot switch from lifetime to subscription

---

#### Test Case 3.2: Lifetime → Lower Tier (Downgrade Not Allowed)

**Setup**:
1. Organization with Pro Lifetime plan

**Steps**:
1. Click "Upgrade Plan"
2. Verify Starter Lifetime is disabled or not shown

**Expected Results**:
- ✅ Lower tier plans not available
- ✅ Error message if attempted via API

---

#### Test Case 3.3: Upgrade to Same Plan

**Setup**:
1. Organization with any plan

**Steps**:
1. Open "Change Plan" modal
2. Click on current plan

**Expected Results**:
- ✅ Shows "Current Plan" button (disabled)
- ✅ Toast: "You are already on this plan"

---

#### Test Case 3.4: Enterprise Plan

**Setup**:
1. Organization with any plan

**Steps**:
1. Open "Change Plan" modal
2. Verify Enterprise not shown or shows "Contact Sales"

**Expected Results**:
- ✅ Enterprise plans require contacting sales
- ✅ Not available for self-service upgrade

---

### 4. Edge Cases

#### Test Case 4.1: Upgrade Near End of Billing Period

**Setup**:
1. Organization with monthly subscription
2. Only 1-2 days remaining in billing period

**Steps**:
1. Attempt upgrade to lifetime
2. Verify minimal credit given

**Expected Results**:
- ✅ Small credit calculated (1-2 days worth)
- ✅ Final price nearly equals lifetime price
- ✅ Upgrade completes successfully

---

#### Test Case 4.2: Failed Payment

**Setup**:
1. Organization ready to upgrade
2. Use failing test card (4000 0000 0000 0002)

**Steps**:
1. Start upgrade process
2. Use declining card in Stripe checkout
3. Payment fails

**Expected Results**:
- ✅ Error shown to user
- ✅ Old subscription NOT canceled
- ✅ Database not updated
- ✅ User can retry upgrade

---

#### Test Case 4.3: Webhook Delayed/Failed

**Setup**:
1. Temporarily disable webhook endpoint
2. Complete upgrade payment

**Steps**:
1. Payment succeeds in Stripe
2. Webhook fails to deliver
3. Manually retry webhook from Stripe dashboard

**Expected Results**:
- ✅ Webhook retry updates database
- ✅ Idempotent handling (no duplicate processing)
- ✅ User subscription eventually updated

---

#### Test Case 4.4: Abandoned Checkout

**Setup**:
1. Start upgrade process
2. Reach Stripe checkout page

**Steps**:
1. Close checkout without paying
2. Return to billing page

**Expected Results**:
- ✅ Old subscription still active
- ✅ Can retry upgrade
- ✅ No partial state in database

---

#### Test Case 4.5: Double Upgrade Attempt

**Setup**:
1. Start upgrade in one browser tab
2. Open another browser tab

**Steps**:
1. In tab 1: Start upgrade to Pro Lifetime
2. In tab 2: Try to start upgrade to Premium Lifetime simultaneously

**Expected Results**:
- ✅ Both checkouts can be initiated (Stripe handles race conditions)
- ✅ First completed payment wins
- ✅ Second payment should fail or refund

---

### 5. UI/UX Testing

#### Test Case 5.1: ChangePlanModal - Monthly User

**Steps**:
1. Open modal as monthly subscriber
2. Verify UI displays:
   - Both monthly and lifetime plans
   - Clear pricing for each
   - "ONE-TIME" vs "/MONTH" labels
   - "Lifetime" badges on lifetime plans
   - Upgrade pricing breakdown when selecting lifetime

**Expected Results**:
- ✅ Clear distinction between plan types
- ✅ Pricing breakdown is easy to understand
- ✅ Visual indicators for lifetime plans

---

#### Test Case 5.2: ChangePlanModal - Lifetime User

**Steps**:
1. Open modal as lifetime subscriber
2. Verify UI shows:
   - Title: "Upgrade Lifetime Plan"
   - Description mentions no downgrades
   - Only higher tier lifetime plans enabled
   - Current plan has "Current Plan" badge
   - Lower tiers disabled or hidden

**Expected Results**:
- ✅ Clear that downgrades not allowed
- ✅ Only valid upgrades shown
- ✅ Current plan clearly marked

---

#### Test Case 5.3: SubscriptionManager - Lifetime Plan

**Steps**:
1. Navigate to Settings > Billing as lifetime user
2. Verify displays:
   - "Lifetime plan" badge/notice
   - "Upgrade Plan" button (not "Change Plan")
   - No "Cancel Subscription" button
   - No next billing date

**Expected Results**:
- ✅ Lifetime status clearly communicated
- ✅ Upgrade option available
- ✅ No confusing subscription management options

---

#### Test Case 5.4: Pricing Breakdown Clarity (in ChangePlanModal)

**Steps**:
1. Select upgrade from monthly to lifetime
2. Verify pricing breakdown shows:
   - Lifetime Plan Price: $X.XX
   - Credit from Current Subscription: -$X.XX
   - Total Due Today: $X.XX
   - Explanation text about subscription cancellation

**Expected Results**:
- ✅ Math is correct
- ✅ Credit clearly shown as negative/green
- ✅ Final price prominent
- ✅ User understands what's happening

---

#### Test Case 5.5: Checkout Page Upgrade UI

**Steps**:
1. Proceed with an upgrade (from modal, click "Confirm Upgrade")
2. Verify redirect to `/checkout?...` page
3. Verify checkout page displays:
   - "Complete Your Upgrade" title
   - "Upgrade Summary" (not "Order Summary")
   - Plan name with "Lifetime" badge
   - Pricing breakdown:
     - Plan Price
     - Credit (in green with minus sign)
     - Upgrade Cost (final price)
   - "What you get" benefits section
   - Stripe Payment Element
   - Fine print about one-time payment and subscription cancellation

**Expected Results**:
- ✅ Consistent UX with regular checkout (uses Stripe Elements, not hosted checkout)
- ✅ Upgrade-specific messaging and layout
- ✅ Pricing breakdown matches modal
- ✅ Benefits section visible for upgrades

---

### 6. Data Integrity Testing

#### Test Case 6.1: Subscription Record

After each successful upgrade, verify database:

```sql
SELECT 
  id,
  org_id,
  status,
  plan_id,
  stripe_subscription_id,
  current_period_start,
  current_period_end,
  metadata
FROM subscriptions
WHERE org_id = 'TEST_ORG_ID';
```

**Expected for Lifetime**:
- ✅ `status = 'lifetime'`
- ✅ `stripe_subscription_id = null`
- ✅ `current_period_start = null`
- ✅ `current_period_end = null`
- ✅ `plan_id` matches target plan
- ✅ `metadata.upgrade_history` array exists

---

#### Test Case 6.2: Stripe Subscription Canceled

After upgrading from monthly to lifetime:

1. Check Stripe Dashboard
2. Find old subscription
3. Verify status = "canceled"

**Expected**:
- ✅ Old subscription canceled in Stripe
- ✅ No future charges will occur

---

#### Test Case 6.3: Upgrade History

After multiple upgrades:

```sql
SELECT metadata->'upgrade_history' as history
FROM subscriptions
WHERE org_id = 'TEST_ORG_ID';
```

**Expected**:
- ✅ Array contains all upgrades in chronological order
- ✅ Each record has: from_plan, to_plan, date, amount_paid
- ✅ History is preserved across upgrades

---

### 7. Performance Testing

#### Test Case 7.1: Upgrade Calculation Speed

**Steps**:
1. Measure time from selecting plan to showing pricing breakdown
2. Should include API call to calculate-upgrade

**Expected Results**:
- ✅ < 2 seconds for calculation
- ✅ Loading indicator shown during calculation
- ✅ No UI freezing

---

#### Test Case 7.2: Modal Load Time

**Steps**:
1. Measure time from clicking "Change Plan" to modal fully rendered
2. Includes fetching all plans

**Expected Results**:
- ✅ < 1 second to open modal
- ✅ Plans load smoothly
- ✅ No flash of unstyled content

---

### 8. Cross-Browser Testing

Test on:
- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)
- ✅ Mobile Safari (iOS)
- ✅ Chrome Mobile (Android)

Verify:
- Modal displays correctly
- Pricing calculations show properly
- Stripe checkout works
- Responsive design on mobile

---

## Test Data Setup

### Create Test Organizations

```sql
-- Starter Monthly (15 days into cycle)
-- Pro Monthly (10 days into cycle)
-- Business Monthly (1 day into cycle)
-- Starter Lifetime
-- Pro Lifetime
-- Premium Lifetime
```

### Stripe Test Cards

- **Success**: 4242 4242 4242 4242
- **Decline**: 4000 0000 0000 0002
- **Require Auth**: 4000 0025 0000 3155

---

## Automated Testing (Future)

Consider adding:

1. **Unit Tests**:
   - `calculateProratedCredit()` function
   - `validateUpgradeRequest()` function
   - `calculateLifetimeUpgradePrice()` function

2. **Integration Tests**:
   - API endpoint responses
   - Database updates after webhook
   - Stripe API interactions

3. **E2E Tests** (Playwright/Cypress):
   - Full upgrade flow
   - Modal interactions
   - Payment success/failure scenarios

---

## Rollback Plan

If critical issues found:

1. **Frontend Rollback**:
   - Revert ChangePlanModal changes
   - Hide upgrade buttons for lifetime users
   - Deploy frontend hotfix

2. **Backend Rollback**:
   - Disable new endpoints
   - Existing functionality unaffected

3. **Database**:
   - No rollback needed (schema unchanged)
   - Upgrade history preserved in metadata

---

## Sign-off Checklist

Before marking as production-ready:

- [ ] All test cases pass
- [ ] No critical bugs found
- [ ] Performance acceptable
- [ ] Cross-browser tested
- [ ] Mobile tested
- [ ] Backend logs clean
- [ ] Webhook processing reliable
- [ ] Error handling graceful
- [ ] User feedback positive
- [ ] Documentation complete

---

## Known Limitations

Document any known limitations:

1. **Timezone handling**: All times in UTC
2. **Proration precision**: Rounded to 2 decimal places
3. **Upgrade history**: Limited to metadata field size
4. **Enterprise plans**: Still require contact sales

---

## Support Scenarios

Common user questions:

**Q: Can I downgrade my lifetime plan?**
A: No, lifetime plans cannot be downgraded. You can only upgrade to higher tiers.

**Q: What happens to my remaining subscription time?**
A: You'll receive a prorated credit for the unused days, applied to your lifetime upgrade cost.

**Q: Can I switch from lifetime back to monthly?**
A: No, lifetime plans cannot be converted back to monthly subscriptions.

**Q: Will I be charged monthly after upgrading to lifetime?**
A: No, lifetime plans are a one-time payment with no recurring charges.

