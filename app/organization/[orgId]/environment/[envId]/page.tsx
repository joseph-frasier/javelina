import { getEnvironmentById, getOrganizationById, getZonesByEnvironment } from '@/lib/mock-hierarchy-data';
import { EnvironmentClient } from './EnvironmentClient';
import { createClient } from '@/lib/supabase/server';

export default async function EnvironmentPage({
  params
}: {
  params: Promise<{ orgId: string; envId: string }>
}) {
  const { orgId, envId } = await params;
  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch environment
  const { data: environment, error: envError } = await supabase
    .from('environments')
    .select('*')
    .eq('id', envId)
    .single();

  // Fetch organization
  const { data: organization, error: orgError } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .single();

  if (envError || orgError || !environment || !organization) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-orange-dark mb-4">Environment Not Found</h1>
        <p className="text-gray-slate">The requested environment does not exist.</p>
      </div>
    );
  }

  // Get detailed environment data (this should be updated to fetch from Supabase in future)
  const environmentDetail = await getEnvironmentById(envId);
  const organizationDetail = await getOrganizationById(orgId);
  const zones = await getZonesByEnvironment(envId);

  if (!environmentDetail || !organizationDetail) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-orange-dark mb-4">Environment Not Found</h1>
        <p className="text-gray-slate">The requested environment does not exist.</p>
      </div>
    );
  }

  return (
    <EnvironmentClient
      environment={environmentDetail}
      organization={organizationDetail}
      zones={zones}
      orgId={orgId}
      envId={envId}
    />
  );
}

