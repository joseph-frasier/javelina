import { ZoneDetailClient } from '@/app/zone/[id]/ZoneDetailClient';
import { createClient } from '@/lib/supabase/server';

/**
 * NOTE: This server component uses direct Supabase calls for data fetching.
 * This is acceptable because:
 * 1. Auth checks should remain direct per architecture
 * 2. Server components provide better initial load performance
 * 3. All mutations (create/update/delete) go through Express API via server actions
 */

export default async function ZonePage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params;
  const supabase = await createClient();
  
  // Fetch zone with organization data (direct relationship now, no environments)
  const { data: zoneData, error } = await supabase
    .from('zones')
    .select(`
      *,
      organizations (*)
    `)
    .eq('id', id)
    .single();

  // If zone not found, show error
  if (error || !zoneData) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold text-orange-dark mb-4">Zone Not Found</h1>
        <p className="text-gray-slate">The zone &quot;{id}&quot; does not exist.</p>
      </div>
    );
  }

  // Extract organization from nested data
  const organization = zoneData.organizations || null;

  return (
    <ZoneDetailClient 
      zone={zoneData} 
      zoneId={id}
      organization={organization}
    />
  );
}
