import { useState, useEffect, useCallback } from 'react';
import type { OrgEntitlement, CanCreateResourceResponse } from '@/types/billing';

interface UseEntitlementsReturn {
  entitlements: OrgEntitlement[];
  loading: boolean;
  error: string | null;
  hasFeature: (key: string) => boolean;
  getLimit: (key: string) => number | null;
  canCreate: (resource: 'environment' | 'zone' | 'member') => Promise<boolean>;
  checkCanCreate: (resource: 'environment' | 'zone' | 'member') => Promise<CanCreateResourceResponse>;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch and manage organization entitlements
 * 
 * @param orgId - Organization ID
 * @returns Entitlements data and helper functions
 */
export function useEntitlements(orgId: string | null): UseEntitlementsReturn {
  const [entitlements, setEntitlements] = useState<OrgEntitlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEntitlements = useCallback(async () => {
    if (!orgId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/subscriptions/current?org_id=${orgId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch entitlements');
      }

      setEntitlements(data.entitlements || []);
    } catch (err: any) {
      console.error('Error fetching entitlements:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchEntitlements();
  }, [fetchEntitlements]);

  /**
   * Check if organization has access to a boolean feature
   */
  const hasFeature = (key: string): boolean => {
    const entitlement = entitlements.find((e) => e.entitlement_key === key);
    if (!entitlement || entitlement.value_type !== 'boolean') {
      return false;
    }
    return entitlement.value === 'true';
  };

  /**
   * Get numeric limit for an entitlement
   * Returns -1 for unlimited, null if not found
   */
  const getLimit = (key: string): number | null => {
    const entitlement = entitlements.find((e) => e.entitlement_key === key);
    if (!entitlement || entitlement.value_type !== 'numeric') {
      return null;
    }
    const value = parseInt(entitlement.value, 10);
    return isNaN(value) ? null : value;
  };

  /**
   * Check if organization can create a specific resource
   * Returns true/false only
   */
  const canCreate = async (
    resource: 'environment' | 'zone' | 'member'
  ): Promise<boolean> => {
    if (!orgId) return false;

    try {
      const response = await fetch(
        `/api/subscriptions/can-create?org_id=${orgId}&resource_type=${resource}`
      );
      const data = await response.json();

      if (!response.ok) {
        console.error('Error checking can create:', data.error);
        return false;
      }

      return data.can_create === true;
    } catch (error) {
      console.error('Error checking can create:', error);
      return false;
    }
  };

  /**
   * Check if organization can create a resource with detailed response
   * Returns full response with counts, limits, and reason
   */
  const checkCanCreate = async (
    resource: 'environment' | 'zone' | 'member'
  ): Promise<CanCreateResourceResponse> => {
    if (!orgId) {
      return {
        org_id: '',
        resource_type: resource,
        can_create: false,
        reason: 'No organization selected',
      };
    }

    try {
      const response = await fetch(
        `/api/subscriptions/can-create?org_id=${orgId}&resource_type=${resource}`
      );
      const data = await response.json();

      if (!response.ok) {
        return {
          org_id: orgId,
          resource_type: resource,
          can_create: false,
          reason: data.error || 'Failed to check resource limits',
        };
      }

      return data;
    } catch (error: any) {
      return {
        org_id: orgId,
        resource_type: resource,
        can_create: false,
        reason: error.message || 'Failed to check resource limits',
      };
    }
  };

  return {
    entitlements,
    loading,
    error,
    hasFeature,
    getLimit,
    canCreate,
    checkCanCreate,
    refetch: fetchEntitlements,
  };
}

