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

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

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

      default:
        console.log(`Unhandled event type: ${event.type}`);
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

  if (!invoice.subscription) {
    console.log('No subscription associated with invoice');
    return;
  }

  const subscriptionId = typeof invoice.subscription === 'string' 
    ? invoice.subscription 
    : invoice.subscription.id;

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

  if (!invoice.subscription) {
    return;
  }

  const subscriptionId = typeof invoice.subscription === 'string'
    ? invoice.subscription
    : invoice.subscription.id;

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

    // Update organization with Stripe customer ID
    await updateOrgStripeCustomer(orgId, customerId);

    // Check if subscription already exists
    const existing = await getSubscriptionByStripeId(subscription.id);
    if (existing) {
      console.log('Subscription already exists, updating...');
      await updateSubscriptionRecord(subscription.id, subscription);
    } else {
      // Create subscription record
      await createSubscriptionRecord(orgId, subscription);
    }

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
      await updateSubscriptionRecord(subscription.id, subscription);
      console.log('✅ Subscription record updated:', subscription.id);
    } else {
      // Subscription not in database, create it
      const orgId = subscription.metadata?.org_id;
      if (orgId) {
        await createSubscriptionRecord(orgId, subscription);
        console.log('✅ Subscription record created from update:', subscription.id);
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

