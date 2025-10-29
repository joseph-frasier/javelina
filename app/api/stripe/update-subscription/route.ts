import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { org_id, new_price_id } = await request.json();

    if (!org_id || !new_price_id) {
      return NextResponse.json(
        { error: 'Organization ID and new price ID are required' },
        { status: 400 }
      );
    }

    // Verify user has admin access to this organization
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

    if (!['SuperAdmin', 'Admin'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Only organization admins can manage billing' },
        { status: 403 }
      );
    }

    // Get current subscription
    const { data: subscriptionData, error: subError } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('org_id', org_id)
      .in('status', ['active', 'trialing'])
      .single();

    if (subError || !subscriptionData?.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'No active subscription found. Please create a new subscription.' },
        { status: 404 }
      );
    }

    // Get the current subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(
      subscriptionData.stripe_subscription_id
    );

    // Update the subscription with the new price
    // This replaces the current price, not adds to it
    const updatedSubscription = await stripe.subscriptions.update(
      subscriptionData.stripe_subscription_id,
      {
        items: [{
          id: subscription.items.data[0].id,
          price: new_price_id,
        }],
        proration_behavior: 'create_prorations', // Pro-rate the difference
      }
    );

    console.log('✅ Subscription updated:', updatedSubscription.id);

    return NextResponse.json({
      success: true,
      subscription_id: updatedSubscription.id,
      message: 'Subscription updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating subscription:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update subscription' },
      { status: 500 }
    );
  }
}

