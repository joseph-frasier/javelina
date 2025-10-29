import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
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

    // Get org_id from query params
    const searchParams = request.nextUrl.searchParams;
    const org_id = searchParams.get('org_id');

    if (!org_id) {
      return NextResponse.json(
        { error: 'org_id is required' },
        { status: 400 }
      );
    }

    // Verify user has access to organization
    const { data: member, error: memberError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', org_id)
      .eq('user_id', user.id)
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Call get_org_subscription function
    const { data: subscriptionData, error: subError } = await supabase
      .rpc('get_org_subscription', { p_org_id: org_id });

    if (subError) {
      console.error('Error getting subscription:', subError);
      return NextResponse.json(
        { error: 'Failed to fetch subscription' },
        { status: 500 }
      );
    }

    // Get plan details
    let plan = null;
    if (subscriptionData && subscriptionData.plan_code) {
      const { data: planData, error: planError } = await supabase
        .from('plans')
        .select('*')
        .eq('code', subscriptionData.plan_code)
        .single();

      if (!planError && planData) {
        plan = planData;
      }
    }

    // Get entitlements
    const { data: entitlements, error: entError } = await supabase
      .rpc('get_org_entitlements', { p_org_id: org_id });

    if (entError) {
      console.error('Error getting entitlements:', entError);
    }

    return NextResponse.json({
      subscription: subscriptionData,
      plan,
      entitlements: entitlements || [],
    });
  } catch (error: any) {
    console.error('Error in current subscription API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

