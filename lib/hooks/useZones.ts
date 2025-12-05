'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

/**
 * Hook to fetch zones for a specific organization
 * 
 * @param organizationId - The organization ID to fetch zones for
 * @returns React Query result with zones data
 */
export function useZones(organizationId: string | null) {
  return useQuery({
    queryKey: ['zones', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const supabase = createClient();
      const { data, error } = await supabase
        .from('zones')
        .select('*')
        .eq('organization_id', organizationId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });
}
