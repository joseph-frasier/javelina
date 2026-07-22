'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminProtectedRoute } from '@/components/admin/AdminProtectedRoute';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import CustomPricingPanel from '@/components/admin/CustomPricingPanel';
import { adminApi } from '@/lib/api-client';
import { useToastStore } from '@/lib/stores/toast-store';

interface Organization {
  id: string;
  name: string;
  description?: string;
  is_active?: boolean;
}

export default function AdminOrganizationDetailPage() {
  const params = useParams();
  const orgId = params.id as string;
  const { addToast } = useToastStore();
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const orgData = await adminApi.getOrganization(orgId);
      setOrg(orgData as Organization);
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
          <CustomPricingPanel orgId={org.id} orgName={org.name} />
        </Card>
      </AdminLayout>
    </AdminProtectedRoute>
  );
}
