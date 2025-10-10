import { getOrganizationById } from '@/lib/mock-hierarchy-data';
import { OrganizationClient } from './OrganizationClient';
import { createClient } from '@/lib/supabase/server';

export default async function OrganizationPage({ 
  params 
}: { 
  params: Promise<{ orgId: string }> 
}) {
  const { orgId } = await params;
  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch organization
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .single();

  if (orgError || !org) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-orange-dark mb-4">Organization Not Found</h1>
        <p className="text-gray-slate">The organization &quot;{orgId}&quot; does not exist.</p>
      </div>
    );
  }

  // Get org detail data (this should be updated to fetch from Supabase in future)
  const orgDetail = await getOrganizationById(orgId);
  if (!orgDetail) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-orange-dark mb-4">Organization Not Found</h1>
        <p className="text-gray-slate">The organization &quot;{orgId}&quot; does not exist.</p>
      </div>
    );
  }

  return <OrganizationClient org={orgDetail} />;
}
