import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe';

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
    if (!['SuperAdmin', 'Admin'].includes(membership.role)) {
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

    // Create subscription with payment_behavior='default_incomplete'
    // This forces Stripe to create either a PaymentIntent (for paid invoices)
    // or a SetupIntent (for $0 first invoices like trials/coupons)
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: price_id }],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
      },
      expand: ['latest_invoice.payment_intent', 'pending_setup_intent'],
      metadata: {
        org_id: organization.id,
        user_id: user.id,
        plan_code: planCode,
      },
    });

    console.log('✅ Subscription created:', subscription.id);

    // Try PaymentIntent path first (first invoice requires payment)
    // TypeScript doesn't know about expanded fields, so we need to cast
    const latestInvoice = subscription.latest_invoice as Stripe.Invoice | null;
    const pi = (latestInvoice as any)?.payment_intent as Stripe.PaymentIntent | null | undefined;
    
    if (pi?.client_secret) {
      console.log('💳 Returning PaymentIntent client_secret');
      return NextResponse.json({
        subscriptionId: subscription.id,
        clientSecret: pi.client_secret,
        flow: 'payment_intent',
      });
    }

    // If first invoice is $0 (trial/coupon), a SetupIntent will exist
    const si = subscription.pending_setup_intent as Stripe.SetupIntent | null;
    
    if (si?.client_secret) {
      console.log('🔧 Returning SetupIntent client_secret (trial/coupon)');
      return NextResponse.json({
        subscriptionId: subscription.id,
        clientSecret: si.client_secret,
        flow: 'setup_intent',
      });
    }

    // Defensive: expand invoice again if needed
    if (latestInvoice?.id) {
      console.log('🔄 Attempting fallback: re-fetching invoice');
      const refreshed = await stripe.invoices.retrieve(latestInvoice.id, { 
        expand: ['payment_intent'] 
      });
      const fallbackPi = (refreshed as any).payment_intent as Stripe.PaymentIntent | null | undefined;
      
      if (fallbackPi?.client_secret) {
        console.log('💳 Returning PaymentIntent client_secret (fallback)');
        return NextResponse.json({
          subscriptionId: subscription.id,
          clientSecret: fallbackPi.client_secret,
          flow: 'payment_intent',
        });
      }
    }

    console.error('❌ Could not obtain client_secret from subscription');
    return NextResponse.json(
      { error: 'Could not obtain client secret for subscription checkout' },
      { status: 500 }
    );
  } catch (error: any) {
    console.error('Error creating subscription intent:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create subscription intent' },
      { status: 500 }
    );
  }
}
