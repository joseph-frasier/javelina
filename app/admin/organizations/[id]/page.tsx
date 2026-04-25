'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminProtectedRoute } from '@/components/admin/AdminProtectedRoute';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminStatCard } from '@/components/admin/AdminStatCard';
import { AdminStatusBadge, type AdminStatusBadgeVariant } from '@/components/admin/AdminStatusBadge';
import { AdminDataTable, type AdminDataTableColumn } from '@/components/admin/AdminDataTable';
import { adminApi } from '@/lib/api-client';
import { useToastStore } from '@/lib/toast-store';
import { formatDateWithRelative } from '@/lib/utils/time';

interface Organization {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at?: string;
  is_active?: boolean;
  billing_phone?: string;
  billing_email?: string;
  billing_address?: string;
  billing_city?: string;
  billing_state?: string;
  billing_zip?: string;
  admin_contact_email?: string;
  admin_contact_phone?: string;
  member_count?: number;
  zone_count?: number;
  record_count?: number;
}

interface Member {
  organization_id: string;
  user_id: string;
  role: string;
  profiles: { name: string; email: string };
}

const ROLE_VARIANT_MAP: Record<string, AdminStatusBadgeVariant> = {
  SuperAdmin: 'accent',
  Admin: 'info',
  Editor: 'success',
  BillingContact: 'accent',
  Viewer: 'neutral',
};

const ROLE_LABEL_MAP: Record<string, string> = {
  SuperAdmin: 'Super Admin',
  BillingContact: 'Billing Contact',
};

export default function AdminOrganizationDetailPage() {
  const params = useParams();
  const orgId = params.id as string;
  const { addToast } = useToastStore();
  const [org, setOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchData = useCallback(async () => {
    try {
      const orgData = await adminApi.getOrganization(orgId);
      setOrg(orgData as Organization);

      const membersData = await adminApi.getOrganizationMembers(orgId);
      setMembers(
        (membersData || []).map((m: any) => ({
          organization_id: orgId,
          user_id: m.user_id,
          role: m.role,
          profiles: {
            name: m.name,
            email: m.email,
          },
        }))
      );
    } catch (error: any) {
      console.error('Failed to fetch organization data:', error);
      addToast('error', error.message || 'Failed to fetch organization data');
    } finally {
      setLoading(false);
    }
  }, [orgId, addToast]);

  useEffect(() => {
    if (orgId) {
      fetchData();
    }
  }, [orgId, fetchData]);

  const memberColumns: AdminDataTableColumn<Member>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'Name',
        sortValue: (m) => (m.profiles?.name ?? '').toLowerCase(),
        render: (m) => <span className="text-text">{m.profiles?.name}</span>,
      },
      {
        key: 'email',
        header: 'Email',
        sortValue: (m) => (m.profiles?.email ?? '').toLowerCase(),
        render: (m) => <span className="text-text-muted">{m.profiles?.email}</span>,
      },
      {
        key: 'role',
        header: 'Role',
        sortValue: (m) => (m.role ?? '').toLowerCase(),
        render: (m) => (
          <AdminStatusBadge
            variant={ROLE_VARIANT_MAP[m.role] ?? 'neutral'}
            label={ROLE_LABEL_MAP[m.role] ?? m.role}
            dot={false}
          />
        ),
      },
    ],
    []
  );

  if (loading) {
    return (
      <AdminProtectedRoute>
        <AdminLayout>
          <div className="text-center py-12">
            <p className="text-text-muted">Loading organization...</p>
          </div>
        </AdminLayout>
      </AdminProtectedRoute>
    );
  }

  if (!org) {
    return (
      <AdminProtectedRoute>
        <AdminLayout>
          <div className="text-center py-12">
            <p className="text-text-muted">Organization not found</p>
          </div>
        </AdminLayout>
      </AdminProtectedRoute>
    );
  }

  return (
    <AdminProtectedRoute>
      <AdminLayout>
        <AdminPageHeader
          breadcrumb={[
            { label: 'Organizations', href: '/admin/organizations' },
            { label: org.name },
          ]}
          title={org.name}
          subtitle={org.description ?? undefined}
        />

        {org.is_active === false && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20 p-4">
            <div className="flex items-start gap-3">
              <svg
                className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div>
                <h3 className="text-sm font-semibold text-red-800 dark:text-red-400">
                  Organization Disabled
                </h3>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  This organization has been disabled by an administrator. Members cannot perform any actions until it is re-enabled.
                </p>
              </div>
            </div>
          </div>
        )}

        <Card>
          <div className="flex gap-4 mb-6 border-b border-border pb-4">
            {(['overview', 'members'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 font-medium transition-colors ${
                  activeTab === tab
                    ? 'text-text border-b-2 border-accent'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-text mb-4">
                  Basic Information
                </h3>
                <div className="rounded-lg border border-border bg-surface-alt p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-text-muted">Status</span>
                    <AdminStatusBadge
                      variant={org.is_active === false ? 'danger' : 'success'}
                      label={org.is_active === false ? 'Disabled' : 'Active'}
                    />
                  </div>
                  {org.created_at && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-text-muted">Created</span>
                      <span className="text-sm text-text">
                        {formatDateWithRelative(org.created_at).absolute}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-text mb-4">
                  Usage Statistics
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <AdminStatCard
                    label="Members"
                    tone="info"
                    value={org.member_count || 0}
                  />
                  <AdminStatCard
                    label="Zones"
                    tone="accent"
                    value={org.zone_count || 0}
                  />
                  <AdminStatCard
                    label="Records"
                    tone="success"
                    value={org.record_count || 0}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'members' && (
            <div className="space-y-4">
              <p className="text-sm text-text-muted">
                {members.length} {members.length === 1 ? 'member' : 'members'}
              </p>
              <AdminDataTable<Member>
                data={members}
                columns={memberColumns}
                getRowId={(m) => m.user_id}
                pageSize={25}
                emptyState={
                  <div className="py-8 text-center">
                    <p className="text-text-muted text-sm">No members</p>
                  </div>
                }
              />
            </div>
          )}
        </Card>
      </AdminLayout>
    </AdminProtectedRoute>
  );
}
