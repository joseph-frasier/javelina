import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';
import { getPlanByCode } from '@/lib/stripe-helpers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

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

    // Parse request body
    const { name, plan_code = 'free' } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: 'Organization name is required' },
        { status: 400 }
      );
    }

    // Validate plan code
    const validPlanCodes = ['free', 'basic_monthly', 'basic_annual', 'pro_monthly', 'pro_annual', 'enterprise_monthly'];
    if (!validPlanCodes.includes(plan_code)) {
      return NextResponse.json(
        { error: 'Invalid plan code' },
        { status: 400 }
      );
    }

    // Get plan from database
    const plan = await getPlanByCode(plan_code);
    if (!plan) {
      return NextResponse.json(
        { error: 'Plan not found' },
        { status: 404 }
      );
    }

    // Create organization
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name,
        owner_id: user.id,
      })
      .select()
      .single();

    if (orgError || !organization) {
      console.error('Error creating organization:', orgError);
      return NextResponse.json(
        { error: 'Failed to create organization' },
        { status: 500 }
      );
    }

    // Add user as organization admin
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: organization.id,
        user_id: user.id,
        role: 'SuperAdmin',
        environments_count: 0,
        zones_count: 0
      });

    if (memberError) {
      console.error('Error adding user as member:', memberError);
      // Don't fail the request, user is already owner via owner_id
    }

    // Create Stripe customer (even for free plan, for future upgrades)
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.user_metadata?.name || user.email,
      metadata: {
        org_id: organization.id,
        user_id: user.id,
      },
    });

    // Update organization with Stripe customer ID
    const { error: updateError } = await supabase
      .from('organizations')
      .update({ stripe_customer_id: customer.id })
      .eq('id', organization.id);

    if (updateError) {
      console.error('Error updating organization with customer ID:', updateError);
      // Don't fail, we can update it later
    }

    // Create subscription record ONLY for free plan
    // For paid plans, Stripe webhooks will create the subscription after payment
    if (plan_code === 'free') {
      const now = new Date();
      const oneYearFromNow = new Date(now);
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
      
      const { error: subscriptionError } = await supabase
        .from('subscriptions')
        .insert({
          org_id: organization.id,
          plan_id: plan.id,
          status: 'active',
          current_period_start: now.toISOString(),
          current_period_end: oneYearFromNow.toISOString(),
          created_by: user.id,
          metadata: {
            plan_code: plan_code,
          },
        });

      if (subscriptionError) {
        console.error('Error creating subscription:', subscriptionError);
        return NextResponse.json(
          { error: 'Failed to create subscription' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      org_id: organization.id,
      name: organization.name,
      stripe_customer_id: customer.id,
      plan_code,
      message: 'Organization created successfully',
    });
  } catch (error: any) {
    console.error('Error in organization creation:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

