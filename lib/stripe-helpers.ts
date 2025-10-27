/**
 * Stripe Helper Functions
 * 
 * Functions to sync Stripe data with Supabase database
 */

import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import type { Subscription, SubscriptionStatus } from '@/types/billing';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

// =====================================================
// ORGANIZATION LOOKUPS
// =====================================================

/**
 * Find organization by Stripe customer ID
 */
export async function getOrgByStripeCustomer(customerId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('organizations')
    .select('id, name, stripe_customer_id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (error) {
    console.error('Error finding org by customer ID:', error);
    return null;
  }

  return data;
}

/**
 * Find organization by Stripe subscription ID
 */
export async function getOrgByStripeSubscription(subscriptionId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('subscriptions')
    .select(`
      org_id,
      organizations!inner(id, name, stripe_customer_id)
    `)
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  if (error) {
    console.error('Error finding org by subscription ID:', error);
    return null;
  }

  return data.organizations;
}

// =====================================================
// PLAN LOOKUPS
// =====================================================

/**
 * Map Stripe Price ID to database plan ID
 */
export async function getPlanIdFromPriceId(priceId: string): Promise<string | null> {
  const supabase = await createClient();
  
  // Price ID is stored in plan metadata
  const { data, error } = await supabase
    .from('plans')
    .select('id, code, metadata')
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching plans:', error);
    return null;
  }

  // Find plan with matching price_id in metadata
  const plan = data?.find((p) => p.metadata?.price_id === priceId);
  
  return plan?.id || null;
}

/**
 * Get plan by code
 */
export async function getPlanByCode(code: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('plans')
    .select('id, code, name, stripe_product_id, billing_interval, metadata')
    .eq('code', code)
    .eq('is_active', true)
    .single();

  if (error) {
    console.error('Error fetching plan by code:', error);
    return null;
  }

  return data;
}

// =====================================================
// SUBSCRIPTION OPERATIONS
// =====================================================

/**
 * Create subscription record in database
 */
export async function createSubscriptionRecord(
  orgId: string,
  stripeData: Stripe.Subscription
): Promise<Subscription | null> {
  const supabase = await createClient();
  
  // Get plan ID from price ID
  const priceId = stripeData.items.data[0]?.price.id;
  const planId = priceId ? await getPlanIdFromPriceId(priceId) : null;

  const subscriptionData = {
    org_id: orgId,
    stripe_subscription_id: stripeData.id,
    plan_id: planId,
    status: stripeData.status as SubscriptionStatus,
    current_period_start: new Date(stripeData.current_period_start * 1000).toISOString(),
    current_period_end: new Date(stripeData.current_period_end * 1000).toISOString(),
    trial_start: stripeData.trial_start ? new Date(stripeData.trial_start * 1000).toISOString() : null,
    trial_end: stripeData.trial_end ? new Date(stripeData.trial_end * 1000).toISOString() : null,
    cancel_at: stripeData.cancel_at ? new Date(stripeData.cancel_at * 1000).toISOString() : null,
    cancel_at_period_end: stripeData.cancel_at_period_end || false,
    created_by: stripeData.metadata?.user_id || null,
    metadata: stripeData.metadata || {},
  };

  const { data, error } = await supabase
    .from('subscriptions')
    .insert(subscriptionData)
    .select()
    .single();

  if (error) {
    console.error('Error creating subscription record:', error);
    return null;
  }

  // Create subscription items
  if (data && stripeData.items.data.length > 0) {
    await createSubscriptionItems(data.id, stripeData.items.data);
  }

  return data;
}

/**
 * Update subscription record from Stripe data
 */
export async function updateSubscriptionRecord(
  subscriptionId: string,
  stripeData: Stripe.Subscription
): Promise<Subscription | null> {
  const supabase = await createClient();
  
  // Get plan ID from price ID (in case plan changed)
  const priceId = stripeData.items.data[0]?.price.id;
  const planId = priceId ? await getPlanIdFromPriceId(priceId) : null;

  const updateData = {
    plan_id: planId,
    status: stripeData.status as SubscriptionStatus,
    current_period_start: new Date(stripeData.current_period_start * 1000).toISOString(),
    current_period_end: new Date(stripeData.current_period_end * 1000).toISOString(),
    trial_start: stripeData.trial_start ? new Date(stripeData.trial_start * 1000).toISOString() : null,
    trial_end: stripeData.trial_end ? new Date(stripeData.trial_end * 1000).toISOString() : null,
    cancel_at: stripeData.cancel_at ? new Date(stripeData.cancel_at * 1000).toISOString() : null,
    cancel_at_period_end: stripeData.cancel_at_period_end || false,
    metadata: stripeData.metadata || {},
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('subscriptions')
    .update(updateData)
    .eq('stripe_subscription_id', subscriptionId)
    .select()
    .single();

  if (error) {
    console.error('Error updating subscription record:', error);
    return null;
  }

  // Update subscription items if plan changed
  if (data && stripeData.items.data.length > 0) {
    // Delete old items
    await supabase
      .from('subscription_items')
      .delete()
      .eq('subscription_id', data.id);
    
    // Create new items
    await createSubscriptionItems(data.id, stripeData.items.data);
  }

  return data;
}

/**
 * Create subscription items
 */
async function createSubscriptionItems(
  subscriptionId: string,
  items: Stripe.SubscriptionItem[]
): Promise<void> {
  const supabase = await createClient();
  
  const itemsData = items.map((item) => ({
    subscription_id: subscriptionId,
    stripe_price_id: item.price.id,
    quantity: item.quantity || 1,
  }));

  const { error } = await supabase
    .from('subscription_items')
    .insert(itemsData);

  if (error) {
    console.error('Error creating subscription items:', error);
  }
}

/**
 * Mark subscription as canceled
 */
export async function cancelSubscriptionRecord(
  subscriptionId: string
): Promise<void> {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscriptionId);

  if (error) {
    console.error('Error canceling subscription record:', error);
  }
}

/**
 * Update subscription status
 */
export async function updateSubscriptionStatus(
  subscriptionId: string,
  status: SubscriptionStatus,
  periodEnd?: Date
): Promise<void> {
  const supabase = await createClient();
  
  const updateData: any = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (periodEnd) {
    updateData.current_period_end = periodEnd.toISOString();
  }

  const { error } = await supabase
    .from('subscriptions')
    .update(updateData)
    .eq('stripe_subscription_id', subscriptionId);

  if (error) {
    console.error('Error updating subscription status:', error);
  }
}

// =====================================================
// SYNC OPERATIONS
// =====================================================

/**
 * Fetch subscription from Stripe and sync to database
 */
export async function syncSubscriptionFromStripe(
  subscriptionId: string
): Promise<Subscription | null> {
  try {
    // Fetch from Stripe
    const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    // Check if exists in database
    const supabase = await createClient();
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('id, org_id')
      .eq('stripe_subscription_id', subscriptionId)
      .single();

    if (existing) {
      // Update existing
      return await updateSubscriptionRecord(subscriptionId, stripeSubscription);
    } else {
      // Create new (need org_id from metadata or customer)
      const orgId = stripeSubscription.metadata?.org_id;
      if (!orgId) {
        console.error('Cannot sync subscription: missing org_id in metadata');
        return null;
      }
      return await createSubscriptionRecord(orgId, stripeSubscription);
    }
  } catch (error) {
    console.error('Error syncing subscription from Stripe:', error);
    return null;
  }
}

/**
 * Update organization's Stripe customer ID
 */
export async function updateOrgStripeCustomer(
  orgId: string,
  customerId: string
): Promise<void> {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('organizations')
    .update({ stripe_customer_id: customerId })
    .eq('id', orgId);

  if (error) {
    console.error('Error updating org stripe customer:', error);
  }
}

/**
 * Get subscription by database ID
 */
export async function getSubscriptionById(id: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching subscription:', error);
    return null;
  }

  return data;
}

/**
 * Get subscription by Stripe subscription ID
 */
export async function getSubscriptionByStripeId(stripeSubscriptionId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('stripe_subscription_id', stripeSubscriptionId)
    .single();

  if (error) {
    console.error('Error fetching subscription by stripe ID:', error);
    return null;
  }

  return data;
}

