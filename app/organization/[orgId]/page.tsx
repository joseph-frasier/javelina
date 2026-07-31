import { cookies } from 'next/headers';
import { OrganizationClient } from './OrganizationClient';
import { getUserRoleInOrganization } from '@/lib/api/roles';
import { getOrganizationAuditLogs, formatAuditLog } from '@/lib/api/audit';

// Force dynamic rendering - don't cache this page
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Organization Page - BFF Architecture
 * 
 * This server component fetches data through the Express API backend instead of
 * direct Supabase calls. This ensures Auth0 users (who don't have Supabase Auth
 * sessions) can access the application.
 * 
 * Authentication: Uses session cookie set by Express backend
 * Authorization: Handled by Express API using service role key
 */
export default async function OrganizationPage({ 
  params 
}: { 
  params: Promise<{ orgId: string }> 
}) {
  const { orgId } = await params;
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('javelina_session');

  // Check for session cookie (set by Express after Auth0 login)
  if (!sessionCookie) {
    return (
      <div className="max-w-[1600px] 2xl:max-w-[1900px] 3xl:max-w-full mx-auto lg:px-6 py-8">
        <h1 className="text-3xl font-bold text-text mb-4">Not Authenticated</h1>
        <p className="text-text-muted">Please log in to view this organization.</p>
      </div>
    );
  }

  const authHeaders = {
    'Cookie': `javelina_session=${sessionCookie.value}`,
  };

  // All four reads are independent of each other's data — only the error
  // checks below are ordered. Awaiting them serially cost ~4x the necessary
  // TTFB on what is one of the two heaviest pages in the app.
  const [orgResponse, userRole, zonesResponse, auditLogs] = await Promise.all([
    fetch(`${API_BASE_URL}/api/organizations/${orgId}`, {
      method: 'GET',
      headers: authHeaders,
      cache: 'no-store',
    }),
    getUserRoleInOrganization(orgId),
    fetch(`${API_BASE_URL}/api/zones/organization/${orgId}`, {
      method: 'GET',
      headers: authHeaders,
      cache: 'no-store',
    }),
    getOrganizationAuditLogs(orgId, 10).catch(() => []),
  ]);

  if (!orgResponse.ok) {
    const errorData = await orgResponse.json().catch(() => ({}));
    
    // Handle specific error cases
    if (orgResponse.status === 404) {
      return (
        <div className="max-w-[1600px] 2xl:max-w-[1900px] 3xl:max-w-full mx-auto lg:px-6 py-8">
          <h1 className="text-3xl font-bold text-text mb-4">Organization Not Found</h1>
          <p className="text-text-muted">The organization does not exist or you don&apos;t have access to it.</p>
        </div>
      );
    }
    
    if (orgResponse.status === 403) {
      return (
        <div className="max-w-[1600px] 2xl:max-w-[1900px] 3xl:max-w-full mx-auto lg:px-6 py-8">
          <h1 className="text-3xl font-bold text-text mb-4">Access Denied</h1>
          <p className="text-text-muted">You don&apos;t have access to this organization.</p>
        </div>
      );
    }

    // Generic error
    return (
      <div className="max-w-[1600px] 2xl:max-w-[1900px] 3xl:max-w-full mx-auto lg:px-6 py-8">
        <h1 className="text-3xl font-bold text-text mb-4">Error Loading Organization</h1>
        <p className="text-text-muted">{errorData.error || 'An unexpected error occurred.'}</p>
      </div>
    );
  }

  const orgResult = await orgResponse.json();
  const org = orgResult.data || orgResult;

  if (!userRole) {
    return (
      <div className="max-w-[1600px] 2xl:max-w-[1900px] 3xl:max-w-full mx-auto lg:px-6 py-8">
        <h1 className="text-3xl font-bold text-text mb-4">Access Denied</h1>
        <p className="text-text-muted">You don&apos;t have access to this organization.</p>
      </div>
    );
  }

  let zonesWithData = [];
  let zonesCount = 0;

  if (zonesResponse.ok) {
    const zonesResult = await zonesResponse.json();
    const allZones = zonesResult.data || zonesResult || [];
    zonesCount = allZones.length;

    // Transform zones data to match expected format
    zonesWithData = allZones.map((zone: any) => ({
      id: zone.id,
      name: zone.name,
      organization_id: zone.organization_id,
      status: (zone.live ? 'active' : 'inactive') as 'active' | 'inactive',
      records_count: zone.records_count || 0,
    }));
  }

  // Editors only see DNS-related audit logs. The fetch above runs
  // unconditionally so it can be parallelized with the other three reads; the
  // role gate is applied here instead. The response is discarded for Editors,
  // so nothing they shouldn't see is ever rendered.
  const recentActivity =
    userRole !== 'Editor'
      ? await Promise.all(auditLogs.map(log => formatAuditLog(log)))
      : [];

  // Prepare organization data for client component
  const orgData = {
    id: org.id,
    name: org.name,
    description: org.description,
    role: userRole,
    is_active: org.is_active !== false, // Default to true if not set
    zonesCount: zonesCount,
    zones: zonesWithData,
    recentActivity: recentActivity,
    created_at: org.created_at,
    updated_at: org.updated_at,
    pending_plan_code: org.pending_plan_code || null,
    pending_price_id: org.pending_price_id || null,
  };

  return <OrganizationClient org={orgData} />;
}
