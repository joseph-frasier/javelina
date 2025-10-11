import { getEnvironmentById, getOrganizationById, getZonesByEnvironment } from '@/lib/mock-hierarchy-data';
import { EnvironmentClient } from './EnvironmentClient';

export default async function EnvironmentPage({
  params
}: {
  params: Promise<{ orgId: string; envId: string }>
}) {
  const { orgId, envId } = await params;
  const environment = getEnvironmentById(envId);
  const organization = getOrganizationById(orgId);
  const zones = getZonesByEnvironment(envId);

  if (!environment || !organization) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-orange-dark mb-4">Environment Not Found</h1>
        <p className="text-gray-slate">The requested environment does not exist.</p>
      </div>
    );
  }

  return (
    <EnvironmentClient
      environment={environment}
      organization={organization}
      zones={zones}
      orgId={orgId}
      envId={envId}
    />
  );
}

