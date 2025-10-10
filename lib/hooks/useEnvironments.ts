'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

/**
 * Hook to fetch environments for a specific organization
 * 
 * @param organizationId - The organization ID to fetch environments for
 * @returns React Query result with environments data
 */
export function useEnvironments(organizationId: string | null) {
  return useQuery({
    queryKey: ['environments', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const supabase = createClient();
      const { data, error } = await supabase
        .from('environments')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });
}

