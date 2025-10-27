# Deployment Checklist

Complete checklist for deploying Javelina with Stripe integration.

## Pre-Deployment

### Database Setup

- [ ] Supabase project created
- [ ] Base schema deployed (`supabase/schema.sql`)
- [ ] Billing schema deployed (`supabase/billing-schema-v2.sql`)
- [ ] Seed data loaded (`supabase/seed-billing-data.sql`)
- [ ] RLS policies enabled and tested
- [ ] Database migrations backed up

### Stripe Configuration

- [ ] Stripe account created
- [ ] Products created (Free, Basic, Pro, Enterprise)
- [ ] Prices created for each plan
- [ ] Price IDs updated in `lib/plans-config.ts`
- [ ] Test mode fully tested
- [ ] Ready to switch to live mode

### Environment Variables

- [ ] All variables documented in ENVIRONMENT_VARIABLES.md
- [ ] `.env.local` configured for development
- [ ] Production variables prepared (not committed)
- [ ] Webhook secrets for each environment

---

## Deployment Steps

### 1. Code Preparation

- [ ] All tests passing
- [ ] No linting errors
- [ ] No console errors in browser
- [ ] Dependencies up to date
- [ ] Build succeeds locally (`npm run build`)

### 2. Environment Setup (Production)

- [ ] Supabase production project ready
- [ ] Production database schema deployed
- [ ] Seed data loaded in production
- [ ] Stripe live mode enabled
- [ ] Production environment variables set

### 3. Deploy Application

#### Vercel Deployment

```bash
# 1. Connect to Vercel
vercel

# 2. Set environment variables in Vercel dashboard
# Settings → Environment Variables

# 3. Deploy
vercel --prod
```

#### Other Platforms

- [ ] Set environment variables
- [ ] Deploy from git branch
- [ ] Wait for build to complete

### 4. Configure Stripe Webhooks (Production)

- [ ] Add production webhook endpoint:
  ```
  https://yourdomain.com/api/stripe/webhook
  ```

- [ ] Select webhook events:
  - [ ] `invoice.payment_succeeded`
  - [ ] `invoice.payment_failed`
  - [ ] `customer.subscription.created`
  - [ ] `customer.subscription.updated`
  - [ ] `customer.subscription.deleted`

- [ ] Copy webhook signing secret
- [ ] Update production `STRIPE_WEBHOOK_SECRET`
- [ ] Test webhook delivery (Stripe dashboard)

### 5. Enable Stripe Live Mode

- [ ] Switch Stripe dashboard to **Live mode**
- [ ] Get live API keys
- [ ] Update production environment variables:
  - [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...`
  - [ ] `STRIPE_SECRET_KEY=sk_live_...`
- [ ] Verify products exist in live mode
- [ ] Verify prices match live mode

### 6. Configure Stripe Customer Portal

- [ ] Go to Settings → Billing → Customer portal
- [ ] Click **Activate**
- [ ] Enable features:
  - [ ] Invoice history
  - [ ] Update payment method
  - [ ] Cancel subscriptions
- [ ] Configure cancellation behavior
- [ ] Save settings

---

## Post-Deployment Testing

### Critical Path Tests

#### 1. Free Plan Signup
- [ ] Navigate to `/pricing`
- [ ] Click "Start Free"
- [ ] Organization created successfully
- [ ] Subscription record exists in database
- [ ] Status is "active"

#### 2. Paid Plan Purchase (Small Test)
- [ ] Select Basic Monthly plan
- [ ] Complete checkout with real card (small amount)
- [ ] Payment succeeds
- [ ] Webhook fires and processes
- [ ] Subscription becomes "active"
- [ ] Customer record in Stripe
- [ ] Database record created

#### 3. Billing Portal
- [ ] Navigate to `/settings/billing`
- [ ] Click "Manage Billing"
- [ ] Portal opens successfully
- [ ] Can view invoices
- [ ] Can update payment method
- [ ] Can cancel subscription

#### 4. Entitlement Enforcement
- [ ] Try creating resources
- [ ] Hit limit on free plan
- [ ] See upgrade prompt
- [ ] Upgrade to paid plan
- [ ] Can create more resources

### Webhook Verification

- [ ] Go to Stripe Dashboard → Developers → Webhooks
- [ ] Click your production endpoint
- [ ] Verify recent events show success (200 OK)
- [ ] No failed events in last hour
- [ ] Check application logs for webhook processing

### Performance Checks

- [ ] Page load times < 3 seconds
- [ ] Checkout flow smooth
- [ ] No console errors
- [ ] Mobile responsive
- [ ] Stripe Elements loads quickly

---

## Monitoring Setup

### Application Monitoring

- [ ] Error tracking enabled (Sentry, etc.)
- [ ] Logging configured
- [ ] Performance monitoring
- [ ] Uptime monitoring

### Stripe Monitoring

- [ ] Email notifications enabled
- [ ] Webhook failure alerts
- [ ] Payment failure notifications
- [ ] Subscription churn alerts

### Database Monitoring

- [ ] Supabase dashboard checked
- [ ] Query performance acceptable
- [ ] No RLS policy errors
- [ ] Backup schedule configured

---

## Security Checklist

### Environment

- [ ] `.env.local` in `.gitignore`
- [ ] No secrets in code
- [ ] Production secrets not shared
- [ ] Service role key secure
- [ ] HTTPS enabled

### Stripe

- [ ] Using live mode keys in production
- [ ] Webhook signature verification enabled
- [ ] Test mode keys removed from production
- [ ] API keys rotated if leaked

### Database

- [ ] RLS policies enabled
- [ ] Service role used only server-side
- [ ] User roles configured correctly
- [ ] Sensitive data encrypted

---

## Rollback Plan

If critical issues found:

### Quick Rollback

```bash
# Vercel
vercel rollback

# Or redeploy previous commit
git revert HEAD
git push
```

### Disable Billing

If billing has issues:

1. **Pause new signups** - Disable pricing page
2. **Stop webhooks** - Disable in Stripe dashboard
3. **Investigate** - Check logs
4. **Fix** - Deploy fix
5. **Re-enable** - Turn back on

---

## Success Criteria

All must pass before considering deployment complete:

- [ ] Free plan signup works
- [ ] Paid plan purchase works
- [ ] Webhooks process successfully
- [ ] Subscriptions activate correctly
- [ ] Customer portal accessible
- [ ] Entitlements enforce correctly
- [ ] No critical errors in logs
- [ ] Performance acceptable
- [ ] Mobile experience good
- [ ] All team members can access

---

## Post-Launch Tasks

### Day 1

- [ ] Monitor error logs closely
- [ ] Watch webhook delivery
- [ ] Check first real transactions
- [ ] Verify email receipts sent
- [ ] Test customer support flow

### Week 1

- [ ] Review all transactions
- [ ] Check subscription renewals
- [ ] Monitor churn rate
- [ ] Gather user feedback
- [ ] Fix any minor issues

### Month 1

- [ ] Analyze conversion funnel
- [ ] Review plan distribution
- [ ] Check resource usage patterns
- [ ] Optimize pricing if needed
- [ ] Plan feature improvements

---

## Emergency Contacts

Keep handy:

- **Stripe Support:** https://support.stripe.com
- **Supabase Support:** https://supabase.com/support
- **Hosting Support:** (Vercel, Railway, etc.)

---

## Common Issues & Solutions

### "Webhook signature verification failed"

**Solution:**
1. Check production webhook secret matches Stripe
2. Verify endpoint URL is correct
3. Check no middleware modifying request body

### "Customer not found"

**Solution:**
1. Check organization has `stripe_customer_id`
2. Verify customer exists in Stripe live mode
3. Check using correct Stripe mode

### "Subscription stays incomplete"

**Solution:**
1. Check webhook is firing
2. Verify webhook handler processing
3. Check database permissions
4. Review webhook logs in Stripe

---

## Additional Resources

- [STRIPE_CONFIGURATION.md](./STRIPE_CONFIGURATION.md) - Detailed Stripe setup
- [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) - All env vars
- [Stripe Documentation](https://stripe.com/docs)
- [Supabase Documentation](https://supabase.com/docs)

