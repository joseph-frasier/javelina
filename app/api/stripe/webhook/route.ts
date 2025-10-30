import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import {
  createSubscriptionRecord,
  updateSubscriptionRecord,
  updateSubscriptionStatus,
  cancelSubscriptionRecord,
  updateOrgStripeCustomer,
  getSubscriptionByStripeId,
} from '@/lib/stripe-helpers';
import { stripe } from '@/lib/stripe';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'No signature provided' },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json(
        { error: `Webhook Error: ${err.message}` },
        { status: 400 }
      );
    }

    // Handle the event
    switch (event.type) {
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.paid':
        // Treat as alias of payment_succeeded
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      default: {
        if (process.env.NODE_ENV === 'development') {
          console.log(`Unhandled event type: ${event.type}`);
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: error.message || 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

// =====================================================
// WEBHOOK EVENT HANDLERS
// =====================================================

/**
 * Handle invoice.payment_succeeded
 * This is the CRITICAL event that activates subscriptions
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('💰 Invoice payment succeeded:', invoice.id);

  const resolveSubscriptionId = async (): Promise<string | null> => {
    // 1) Direct field on invoice (TypeScript doesn't know about expanded fields)
    const invoiceAny = invoice as any;
    if (invoiceAny.subscription) {
      return typeof invoiceAny.subscription === 'string'
        ? invoiceAny.subscription
        : invoiceAny.subscription.id;
    }

    // 2) Check invoice lines
    const lineWithSub: any | undefined = invoice.lines?.data?.find(
      (l: any) => !!l.subscription
    );
    if (lineWithSub?.subscription) {
      return typeof lineWithSub.subscription === 'string'
        ? lineWithSub.subscription
        : lineWithSub.subscription.id;
    }

    // 3) Refetch invoice with expansion
    try {
      const full = await stripe.invoices.retrieve(invoice.id, {
        expand: ['subscription', 'lines.data.subscription'],
      });
      const fullAny = full as any;
      if (fullAny.subscription) {
        return typeof fullAny.subscription === 'string'
          ? fullAny.subscription
          : fullAny.subscription.id;
      }
      const expandedLine: any | undefined = full.lines?.data?.find(
        (l: any) => !!l.subscription
      );
      if (expandedLine?.subscription) {
        return typeof expandedLine.subscription === 'string'
          ? expandedLine.subscription
          : expandedLine.subscription.id;
      }
    } catch (e) {
      console.warn('Failed to refetch invoice for subscription linkage:', invoice.id, e);
    }

    // 4) Last resort: infer from customer's subscriptions matching invoice price
    try {
      if (invoice.customer && typeof invoice.customer === 'string') {
        const subs = await stripe.subscriptions.list({
          customer: invoice.customer,
          status: 'all',
          limit: 10,
          expand: ['data.items.data.price'],
        });
        const invPriceId = (invoice.lines?.data?.[0] as any)?.price?.id;
        const match = subs.data.find((s) =>
          s.items.data.some((it) => it.price?.id === invPriceId)
        );
        if (match) return match.id;
      }
    } catch (e) {
      console.warn('Failed to infer subscription from customer:', invoice.id, e);
    }

    return null;
  };

  const subscriptionId = await resolveSubscriptionId();
  if (!subscriptionId) {
    console.warn('Unable to associate invoice with a subscription:', invoice.id);
    return;
  }

  try {
    // Check if subscription exists in database
    const existingSubscription = await getSubscriptionByStripeId(subscriptionId);

    if (existingSubscription) {
      // Update to active status
      await updateSubscriptionStatus(
        subscriptionId,
        'active',
        new Date(invoice.period_end * 1000)
      );
      console.log('✅ Subscription activated:', subscriptionId);
    } else {
      // Fetch full subscription from Stripe and create record
      const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
      const orgId = stripeSubscription.metadata?.org_id;

      if (orgId) {
        await createSubscriptionRecord(orgId, stripeSubscription);
        console.log('✅ Subscription created and activated:', subscriptionId);
      } else {
        console.error('Cannot create subscription: missing org_id in metadata');
      }
    }
  } catch (error) {
    console.error('Error handling invoice.payment_succeeded:', error);
    throw error;
  }
}

/**
 * Handle invoice.payment_failed
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log('❌ Invoice payment failed:', invoice.id);

  const invoiceAny = invoice as any;
  if (!invoiceAny.subscription) {
    return;
  }

  const subscriptionId = typeof invoiceAny.subscription === 'string'
    ? invoiceAny.subscription
    : invoiceAny.subscription.id;

  try {
    await updateSubscriptionStatus(subscriptionId, 'past_due');
    console.log('⚠️ Subscription marked as past_due:', subscriptionId);

    // TODO: Send notification email to customer
  } catch (error) {
    console.error('Error handling invoice.payment_failed:', error);
    throw error;
  }
}

/**
 * Handle customer.subscription.created
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log('✅ Subscription created:', subscription.id);

  try {
    const orgId = subscription.metadata?.org_id;
    const customerId = typeof subscription.customer === 'string' 
      ? subscription.customer 
      : subscription.customer.id;

    if (!orgId) {
      console.error('Cannot create subscription: missing org_id in metadata');
      return;
    }

    // DEFENSIVE CHECK: Cancel any existing active subscriptions for this org
    // This prevents double-charging when Stripe Customer Portal creates a new subscription
    // instead of updating the existing one
    const existingSubscription = await getSubscriptionByStripeId(subscription.id);
    
    if (!existingSubscription) {
      // This is truly a new subscription, check for other active ones
      const { createClient } = await import('@/lib/supabase/server');
      const supabase = await createClient();
      
      const { data: activeSubscriptions, error: subError } = await supabase
        .from('subscriptions')
        .select('stripe_subscription_id')
        .eq('org_id', orgId)
        .in('status', ['active', 'trialing'])
        .neq('stripe_subscription_id', subscription.id);
      
      if (!subError && activeSubscriptions && activeSubscriptions.length > 0) {
        console.log(`⚠️ Found ${activeSubscriptions.length} existing active subscription(s) for org ${orgId}`);
        
        // Cancel all existing active subscriptions in Stripe to prevent double-charging
        for (const oldSub of activeSubscriptions) {
          if (oldSub.stripe_subscription_id) {
            try {
              console.log(`🗑️ Canceling old subscription in Stripe: ${oldSub.stripe_subscription_id}`);
              await stripe.subscriptions.cancel(oldSub.stripe_subscription_id);
              console.log(`✅ Successfully canceled old subscription: ${oldSub.stripe_subscription_id}`);
            } catch (cancelError: any) {
              console.error(`❌ Error canceling old subscription ${oldSub.stripe_subscription_id}:`, cancelError.message);
              // Continue anyway - the database upsert will replace the record
            }
          }
        }
      }
    }

    // Update organization with Stripe customer ID
    await updateOrgStripeCustomer(orgId, customerId);

    // Use upsert to create or update subscription record
    // This atomically handles concurrent webhook events for the same org
    await createSubscriptionRecord(orgId, subscription);

    console.log('✅ Subscription record synced:', subscription.id);
  } catch (error) {
    console.error('Error handling customer.subscription.created:', error);
    throw error;
  }
}

/**
 * Handle customer.subscription.updated
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('🔄 Subscription updated:', subscription.id);

  try {
    const existing = await getSubscriptionByStripeId(subscription.id);

    if (existing) {
      // Subscription exists in database, update it
      await updateSubscriptionRecord(subscription.id, subscription);
      console.log('✅ Subscription record updated:', subscription.id);
    } else {
      // Subscription not in database, create it with upsert
      // This atomically handles the case where another webhook event
      // is simultaneously creating the same subscription
      const orgId = subscription.metadata?.org_id;
      if (orgId) {
        await createSubscriptionRecord(orgId, subscription);
        console.log('✅ Subscription record created from update:', subscription.id);
      } else {
        console.error('Cannot create subscription from update: missing org_id in metadata');
      }
    }
  } catch (error) {
    console.error('Error handling customer.subscription.updated:', error);
    throw error;
  }
}

/**
 * Handle customer.subscription.deleted
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('🗑️ Subscription deleted:', subscription.id);

  try {
    await cancelSubscriptionRecord(subscription.id);
    console.log('✅ Subscription marked as canceled:', subscription.id);
  } catch (error) {
    console.error('Error handling customer.subscription.deleted:', error);
    throw error;
  }
}
