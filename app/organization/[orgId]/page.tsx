import { getOrganizationById } from '@/lib/mock-hierarchy-data';
import { OrganizationClient } from './OrganizationClient';

export default async function OrganizationPage({ 
  params 
}: { 
  params: Promise<{ orgId: string }> 
}) {
  const { orgId } = await params;
  const org = getOrganizationById(orgId);

  if (!org) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-orange-dark mb-4">Organization Not Found</h1>
        <p className="text-gray-slate">The organization &quot;{orgId}&quot; does not exist.</p>
      </div>
    );
  }

  return <OrganizationClient org={org} />;
}
