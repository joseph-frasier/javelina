'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Hook to fetch zones for a specific organization
 * Routes through Express API: GET /api/zones/organization/:orgId
 * 
 * @param organizationId - The organization ID to fetch zones for
 * @returns React Query result with zones data
 */
export function useZones(organizationId: string | null) {
  return useQuery({
    queryKey: ['zones', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      // Get auth token from Supabase session
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      // Fetch zones from Express API
      const response = await fetch(`${API_BASE_URL}/api/zones/organization/${organizationId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || 'Failed to fetch zones');
      }

      const result = await response.json();
      return result.data || result || [];
    },
    enabled: !!organizationId,
  });
}
