import { ZoneDetailClient } from '@/app/zone/[id]/ZoneDetailClient';
import { createClient } from '@/lib/supabase/server';

export default async function ZonePage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params;
  const supabase = await createClient();
  
  // Fetch zone with environment and organization data
  const { data: zoneData, error } = await supabase
    .from('zones')
    .select(`
      *,
      environments (
        *,
        organizations (*)
      )
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

  // Extract environment and organization from nested data
  const environment = zoneData.environments;
  const organization = environment?.organizations || null;

  return (
    <ZoneDetailClient 
      zone={zoneData} 
      zoneId={id}
      organization={organization}
      environment={environment}
    />
  );
}