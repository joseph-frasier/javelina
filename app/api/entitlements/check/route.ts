import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseEntitlementValue } from '@/types/billing';

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

    // Get parameters from query
    const searchParams = request.nextUrl.searchParams;
    const org_id = searchParams.get('org_id');
    const entitlement_key = searchParams.get('entitlement_key');

    if (!org_id) {
      return NextResponse.json(
        { error: 'org_id is required' },
        { status: 400 }
      );
    }

    if (!entitlement_key) {
      return NextResponse.json(
        { error: 'entitlement_key is required' },
        { status: 400 }
      );
    }

    // Verify user has access to organization
    const { data: member, error: memberError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('org_id', org_id)
      .eq('user_id', user.id)
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Call check_entitlement function
    const { data, error } = await supabase
      .rpc('check_entitlement', {
        p_org_id: org_id,
        p_entitlement_key: entitlement_key,
      });

    if (error) {
      console.error('Error checking entitlement:', error);
      return NextResponse.json(
        { error: 'Failed to check entitlement' },
        { status: 500 }
      );
    }

    // Parse the value based on type
    let parsed_value = null;
    if (data && data.value && data.value_type) {
      parsed_value = parseEntitlementValue(data.value, data.value_type);
    }

    return NextResponse.json({
      org_id,
      entitlement_key,
      value: data?.value || null,
      value_type: data?.value_type || null,
      parsed_value,
    });
  } catch (error: any) {
    console.error('Error in check entitlement API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

