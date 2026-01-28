'use client';

import { useQuery } from '@tantml:react-query';
import { apiClient } from '@/lib/api-client';

/**
 * Hook to fetch zones for a specific organization
 * Routes through Express API: GET /api/zones/organization/:orgId
 * Uses session cookies for authentication
 * 
 * @param organizationId - The organization ID to fetch zones for
 * @returns React Query result with zones data
 */
export function useZones(organizationId: string | null) {
  return useQuery({
    queryKey: ['zones', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      // Fetch zones from Express API (apiClient handles session cookies)
      const zones = await apiClient.get(`/zones/organization/${organizationId}`);
      return zones || [];
    },
    enabled: !!organizationId,
  });
}
