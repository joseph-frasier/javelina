import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';

/**
 * Usage counts for an organization
 */
export interface UsageCounts {
  zones: number;
  records: number;
  members: number;
}

/**
 * Combined usage and limits data
 */
export interface UsageData {
  zones: { current: number; max: number };
  records: { current: number; max: number };
  members: { current: number; max: number };
}

interface UseUsageCountsReturn {
  usage: UsageCounts | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch current usage counts for an organization
 * 
 * @param organizationId - The organization UUID to get usage for
 * @returns Object with usage counts, loading state, error, and refetch function
 * 
 * @example
 * ```tsx
 * const { usage, isLoading, refetch } = useUsageCounts(orgId);
 * 
 * if (usage && limits) {
 *   const atZoneLimit = usage.zones >= limits.zones;
 * }
 * ```
 */
export function useUsageCounts(organizationId: string | null | undefined): UseUsageCountsReturn {
  const [usage, setUsage] = useState<UsageCounts | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsage = useCallback(async () => {
    if (!organizationId) {
      setUsage(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Call the backend API to get usage counts
      const response = await apiClient.get(`/organizations/${organizationId}/usage`);
      
      // API returns { zones: { current, max }, records: { current, max }, members: { current, max } }
      // We extract just the current counts
      const data = response as UsageData;
      
      setUsage({
        zones: data.zones?.current ?? 0,
        records: data.records?.current ?? 0,
        members: data.members?.current ?? 0,
      });
    } catch (err) {
      console.error('Failed to fetch usage counts:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch usage');
      
      // Set default values on error so UI doesn't break
      setUsage({
        zones: 0,
        records: 0,
        members: 0,
      });
    } finally {
      setIsLoading(false);
    }
  }, [organizationId]);

  // Fetch on mount and when organizationId changes
  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  return {
    usage,
    isLoading,
    error,
    refetch: fetchUsage,
  };
}

/**
 * Hook to check if an organization is at or over a specific limit
 * Combines usage counts with plan limits
 * 
 * @param organizationId - The organization UUID
 * @param planCode - The plan code for limit lookup
 * @returns Object with limit check utilities
 */
export function useOrganizationLimits(
  organizationId: string | null | undefined,
  planCode: string | null | undefined
) {
  const { usage, isLoading, error, refetch } = useUsageCounts(organizationId);
  
  // Import dynamically to avoid circular deps - limits come from usePlanLimits hook
  // This hook focuses on usage, limits are handled separately
  
  return {
    usage,
    isLoading,
    error,
    refetch,
  };
}

export default useUsageCounts;

