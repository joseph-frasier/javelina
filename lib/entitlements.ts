/**
 * Entitlement Helper Functions
 * 
 * Server-side utilities for checking feature access and resource limits
 */

import { createClient } from '@/lib/supabase/server';
import type { OrgUsage } from '@/types/billing';

/**
 * Check if organization has access to a specific feature
 */
export async function checkFeatureAccess(
  orgId: string,
  feature: string
): Promise<boolean> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .rpc('check_entitlement', {
      p_org_id: orgId,
      p_entitlement_key: feature,
    });

  if (error) {
    console.error('Error checking feature access:', error);
    return false;
  }

  return data?.value === 'true';
}

/**
 * Get current resource usage for an organization
 */
export async function getOrgUsage(orgId: string): Promise<OrgUsage> {
  const supabase = await createClient();
  
  // Get organization with environments count
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('environments_count')
    .eq('id', orgId)
    .single();

  // Get total zones count from all environments
  const { data: environments, error: envError } = await supabase
    .from('environments')
    .select('zones_count')
    .eq('org_id', orgId);

  const totalZones = environments?.reduce((sum, env) => sum + (env.zones_count || 0), 0) || 0;

  // Get members count
  const { count: membersCount, error: membersError } = await supabase
    .from('organization_members')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', orgId);

  // TODO: Get DNS records count if needed
  // This would require querying across zones

  return {
    org_id: orgId,
    environments_count: org?.environments_count || 0,
    zones_count: totalZones,
    members_count: membersCount || 0,
    dns_records_count: 0, // TODO: Implement if needed
  };
}

/**
 * Check if organization can create a specific resource type
 */
export async function canCreateResource(
  orgId: string,
  resourceType: 'environment' | 'zone' | 'member'
): Promise<{ canCreate: boolean; reason?: string; currentCount?: number; limit?: number }> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .rpc('can_create_resource', {
      p_org_id: orgId,
      p_resource_type: resourceType,
    });

  if (error) {
    console.error('Error checking resource creation:', error);
    return {
      canCreate: false,
      reason: 'Failed to check resource limits',
    };
  }

  // Get current usage and limits for better error messages
  const usage = await getOrgUsage(orgId);
  const limitKey = `${resourceType === 'member' ? 'team_members' : resourceType}s_limit`;
  
  const { data: entitlement } = await supabase
    .rpc('check_entitlement', {
      p_org_id: orgId,
      p_entitlement_key: limitKey,
    });

  const limit = entitlement?.value ? parseInt(entitlement.value, 10) : null;
  const currentCount = resourceType === 'environment'
    ? usage.environments_count
    : resourceType === 'zone'
    ? usage.zones_count
    : usage.members_count;

  if (!data) {
    return {
      canCreate: false,
      reason: limit === -1
        ? 'Unlimited resources available'
        : `${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} limit reached (${currentCount}/${limit})`,
      currentCount,
      limit: limit !== null ? limit : undefined,
    };
  }

  return {
    canCreate: true,
    currentCount,
    limit: limit !== null ? limit : undefined,
  };
}

/**
 * Get numeric limit for a specific entitlement
 */
export async function getEntitlementLimit(
  orgId: string,
  entitlementKey: string
): Promise<number | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .rpc('check_entitlement', {
      p_org_id: orgId,
      p_entitlement_key: entitlementKey,
    });

  if (error || !data?.value) {
    return null;
  }

  const value = parseInt(data.value, 10);
  return isNaN(value) ? null : value;
}

/**
 * Format entitlement value for display
 */
export function formatEntitlementValue(value: any, type: string): string {
  switch (type) {
    case 'boolean':
      return value === 'true' || value === true ? 'Yes' : 'No';
    case 'numeric':
      const num = typeof value === 'string' ? parseInt(value, 10) : value;
      if (num === -1) return 'Unlimited';
      if (isNaN(num)) return 'Not set';
      return num.toLocaleString();
    case 'text':
    default:
      return String(value);
  }
}

/**
 * Check multiple entitlements at once
 */
export async function checkMultipleEntitlements(
  orgId: string,
  entitlementKeys: string[]
): Promise<Record<string, { value: string; value_type: string }>> {
  const supabase = await createClient();
  
  const results: Record<string, { value: string; value_type: string }> = {};

  // Fetch all entitlements for the org
  const { data: entitlements, error } = await supabase
    .rpc('get_org_entitlements', { p_org_id: orgId });

  if (error || !entitlements) {
    return results;
  }

  // Map requested keys to results
  entitlementKeys.forEach((key) => {
    const entitlement = entitlements.find((e: any) => e.entitlement_key === key);
    if (entitlement) {
      results[key] = {
        value: entitlement.value,
        value_type: entitlement.value_type,
      };
    }
  });

  return results;
}

/**
 * Increment cached resource count
 */
export async function incrementResourceCount(
  orgId: string,
  resourceType: 'environment' | 'zone'
): Promise<void> {
  const supabase = await createClient();

  if (resourceType === 'environment') {
    await supabase
      .from('organizations')
      .update({ environments_count: supabase.raw('environments_count + 1') })
      .eq('id', orgId);
  }
  // For zones, we increment the environment's zones_count instead
  // This should be called with the environment_id
}

/**
 * Decrement cached resource count
 */
export async function decrementResourceCount(
  orgId: string,
  resourceType: 'environment' | 'zone'
): Promise<void> {
  const supabase = await createClient();

  if (resourceType === 'environment') {
    await supabase
      .from('organizations')
      .update({ 
        environments_count: supabase.raw('GREATEST(environments_count - 1, 0)') 
      })
      .eq('id', orgId);
  }
}

