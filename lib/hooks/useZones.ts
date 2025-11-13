'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

/**
 * Hook to fetch zones for a specific environment
 * 
 * @param environmentId - The environment ID to fetch zones for
 * @returns React Query result with zones data
 */
export function useZones(environmentId: string | null) {
  return useQuery({
    queryKey: ['zones', environmentId],
    queryFn: async () => {
      if (!environmentId) return [];
      
      const supabase = createClient();
      const { data, error } = await supabase
        .from('zones')
        .select('*')
        .eq('environment_id', environmentId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!environmentId,
  });
}

