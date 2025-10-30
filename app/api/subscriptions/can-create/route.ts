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

    // Get parameters from query
    const searchParams = request.nextUrl.searchParams;
    const org_id = searchParams.get('org_id');
    const resource_type = searchParams.get('resource_type');

    if (!org_id) {
      return NextResponse.json(
        { error: 'org_id is required' },
        { status: 400 }
      );
    }

    if (!resource_type) {
      return NextResponse.json(
        { error: 'resource_type is required' },
        { status: 400 }
      );
    }

    // Validate resource type
    const validTypes = ['environment', 'zone', 'member'];
    if (!validTypes.includes(resource_type)) {
      return NextResponse.json(
        { error: 'Invalid resource_type. Must be: environment, zone, or member' },
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

    // Call can_create_resource function
    const { data, error } = await supabase
      .rpc('can_create_resource', {
        p_org_id: org_id,
        p_resource_type: resource_type,
      });

    if (error) {
      console.error('Error checking can_create_resource:', error);
      return NextResponse.json(
        { error: 'Failed to check resource creation permission' },
        { status: 500 }
      );
    }

    // Get current count and limit for more detailed response
    let current_count = 0;
    let limit: number | null = null;
    let entitlement_key = '';

    // Map resource type to entitlement key
    switch (resource_type) {
      case 'environment':
        entitlement_key = 'environments_limit';
        break;
      case 'zone':
        entitlement_key = 'zones_limit';
        break;
      case 'member':
        entitlement_key = 'team_members_limit';
        break;
    }

    // Get the limit
    const { data: entitlement } = await supabase
      .rpc('check_entitlement', {
        p_org_id: org_id,
        p_entitlement_key: entitlement_key,
      });

    if (entitlement?.value) {
      limit = parseInt(entitlement.value, 10);
    }

    // Get current count based on resource type
    if (resource_type === 'environment') {
      const { data: org } = await supabase
        .from('organizations')
        .select('environments_count')
        .eq('id', org_id)
        .single();
      current_count = org?.environments_count || 0;
    } else if (resource_type === 'zone') {
      // Sum zones_count from all environments in this org
      const { data: environments } = await supabase
        .from('environments')
        .select('zones_count')
        .eq('org_id', org_id);
      current_count = environments?.reduce((sum, env) => sum + (env.zones_count || 0), 0) || 0;
    } else if (resource_type === 'member') {
      const { count } = await supabase
        .from('organization_members')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', org_id);
      current_count = count || 0;
    }

    const can_create = data === true;
    let reason = '';

    if (!can_create) {
      if (limit === -1) {
        reason = 'Unlimited resources available';
      } else if (limit !== null && current_count >= limit) {
        reason = `Limit reached: ${current_count}/${limit} ${resource_type}s used`;
      } else {
        reason = 'Resource creation not allowed by plan';
      }
    }

    return NextResponse.json({
      org_id,
      resource_type,
      can_create,
      current_count,
      limit,
      reason: can_create ? undefined : reason,
    });
  } catch (error: any) {
    console.error('Error in can-create API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

