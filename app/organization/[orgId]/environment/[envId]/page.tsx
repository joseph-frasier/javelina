import { EnvironmentClient } from './EnvironmentClient';
import { createClient } from '@/lib/supabase/server';
import { getUserRoleInOrganization } from '@/lib/api/roles';

export default async function EnvironmentPage({
  params
}: {
  params: Promise<{ orgId: string; envId: string }>
}) {
  const { orgId, envId } = await params;
  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-orange-dark mb-4">Not Authenticated</h1>
        <p className="text-gray-slate">Please log in to view this environment.</p>
      </div>
    );
  }

  // Fetch environment
  const { data: environment, error: envError } = await supabase
    .from('environments')
    .select('*')
    .eq('id', envId)
    .eq('organization_id', orgId)
    .single();

  // Fetch organization
  const { data: organization, error: orgError } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .single();

  if (envError || orgError || !environment || !organization) {
    return (
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-orange-dark mb-4">Environment Not Found</h1>
        <p className="text-gray-slate">The requested environment does not exist or you don&apos;t have access to it.</p>
      </div>
    );
  }

  // Fetch user's role in the organization
  const userRole = await getUserRoleInOrganization(orgId);

  if (!userRole) {
    return (
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-orange-dark mb-4">Access Denied</h1>
        <p className="text-gray-slate">You don&apos;t have access to this organization.</p>
      </div>
    );
  }

  // Fetch zones for this environment
  const { data: zones, error: zonesError } = await supabase
    .from('zones')
    .select('*')
    .eq('environment_id', envId)
    .order('created_at', { ascending: false });

  // Prepare data for client component
  const environmentData = {
    id: environment.id,
    name: environment.name,
    type: environment.environment_type as 'production' | 'staging' | 'development',
    status: environment.status as 'active' | 'disabled' | 'archived',
    description: environment.description || '',
    location: environment.location || '',
    organization_id: environment.organization_id,
    created_at: environment.created_at,
    updated_at: environment.updated_at,
    created_by: environment.created_by,
  };

  const organizationData = {
    id: organization.id,
    name: organization.name,
    description: organization.description || '',
    role: userRole as 'SuperAdmin' | 'Admin' | 'Editor' | 'Viewer',
  };

  const zonesData = zones || [];

  return (
    <EnvironmentClient
      environment={environmentData}
      organization={organizationData}
      zones={zonesData}
      orgId={orgId}
      envId={envId}
    />
  );
}
