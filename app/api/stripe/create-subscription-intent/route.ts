import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

export async function POST(request: NextRequest) {
  try {
    const { org_id, price_id } = await request.json();

    // Validate required fields
    if (!org_id || !price_id) {
      return NextResponse.json(
        { error: 'Organization ID and Price ID are required' },
        { status: 400 }
      );
    }

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user has access to this organization
    const { data: membership, error: memberError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', org_id)
      .eq('user_id', user.id)
      .single();

    if (memberError || !membership) {
      return NextResponse.json(
        { error: 'You do not have access to this organization' },
        { status: 403 }
      );
    }

    // Only admins can manage billing
    if (membership.role !== 'Admin') {
      return NextResponse.json(
        { error: 'Only organization admins can manage billing' },
        { status: 403 }
      );
    }

    // Get organization details
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, stripe_customer_id')
      .eq('id', org_id)
      .single();

    if (orgError || !organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Create or retrieve Stripe customer
    let customerId = organization.stripe_customer_id;

    if (!customerId) {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          org_id: organization.id,
          user_id: user.id,
        },
        name: organization.name,
      });

      customerId = customer.id;

      // Update organization with Stripe customer ID
      const { error: updateError } = await supabase
        .from('organizations')
        .update({ stripe_customer_id: customerId })
        .eq('id', org_id);

      if (updateError) {
        console.error('Error updating organization with stripe_customer_id:', updateError);
      }
    }

    // Get plan code from price ID for metadata
    const { data: plan } = await supabase
      .from('plans')
      .select('code')
      .eq('metadata->>price_id', price_id)
      .single();

    const planCode = plan?.code || 'unknown';

    // Create Subscription with incomplete status
    // This generates a PaymentIntent that we can use with Stripe Elements
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [
        {
          price: price_id,
        },
      ],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
      },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        org_id: organization.id,
        user_id: user.id,
        plan_code: planCode,
      },
    });

    // Get the client secret from the payment intent
    const invoice = subscription.latest_invoice as Stripe.Invoice;
    const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent;

    if (!paymentIntent || !paymentIntent.client_secret) {
      throw new Error('Failed to create payment intent for subscription');
    }

    return NextResponse.json({
      subscriptionId: subscription.id,
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error: any) {
    console.error('Error creating subscription intent:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create subscription intent' },
      { status: 500 }
    );
  }
}

