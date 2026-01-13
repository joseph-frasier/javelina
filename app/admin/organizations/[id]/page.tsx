'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminProtectedRoute } from '@/components/admin/AdminProtectedRoute';
import { adminApi } from '@/lib/api-client';
import { useToastStore } from '@/lib/toast-store';
import { formatDateWithRelative } from '@/lib/utils/time';
import Link from 'next/link';

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

interface Zone {
  id: string;
  name: string;
  organization_id: string;
  live: boolean;
}

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
      // Fetch organization details via API
      const orgData = await adminApi.getOrganization(orgId);
      setOrg(orgData as Organization);

      // Fetch members via API
      const membersData = await adminApi.getOrganizationMembers(orgId);
      setMembers((membersData || []).map((m: any) => ({
        organization_id: orgId,
        user_id: m.user_id,
        role: m.role,
        profiles: {
          name: m.name,
          email: m.email,
        },
      })));
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
            <p className="text-gray-slate">Loading organization...</p>
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
            <p className="text-gray-slate">Organization not found</p>
          </div>
        </AdminLayout>
      </AdminProtectedRoute>
    );
  }

  return (
    <AdminProtectedRoute>
      <AdminLayout>
        <div className="space-y-6">
          {/* Header */}
          <Link href="/admin/organizations">
            <button className="text-blue-electric hover:underline text-sm mb-4">
              ← Back to Organizations
            </button>
          </Link>

          <div>
            <h1 className="text-3xl font-bold text-orange-dark dark:text-orange">{org.name}</h1>
            {org.description && (
              <p className="text-gray-slate dark:text-gray-300 mt-2">{org.description}</p>
            )}
          </div>

          {/* Disabled Organization Banner */}
          {org.is_active === false && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
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

          {/* Tabs */}
          <Card className="p-6">
            <div className="flex gap-4 mb-6 border-b border-gray-light dark:border-gray-700 pb-4">
              {['overview', 'members'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 font-medium ${
                    activeTab === tab
                      ? 'text-orange-dark border-b-2 border-orange'
                      : 'text-gray-slate'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-orange-dark dark:text-orange mb-4">
                    Basic Information
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Status</span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        org.is_active === false
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      }`}>
                        {org.is_active === false ? 'Disabled' : 'Active'}
                      </span>
                    </div>
                    {org.created_at && (
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Created</span>
                        <span className="text-sm text-gray-900 dark:text-gray-100">
                          {formatDateWithRelative(org.created_at).absolute}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-orange-dark dark:text-orange mb-4">
                    Usage Statistics
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center">
                      <p className="text-3xl font-bold text-orange-dark dark:text-orange">
                        {org.member_count || 0}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Members</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center">
                      <p className="text-3xl font-bold text-orange-dark dark:text-orange">
                        {org.zone_count || 0}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Zones</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center">
                      <p className="text-3xl font-bold text-orange-dark dark:text-orange">
                        {org.record_count || 0}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Records</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Members Tab - Read Only */}
            {activeTab === 'members' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {members.length} {members.length === 1 ? 'member' : 'members'}
                </p>

                {members.length === 0 ? (
                  <p className="text-center py-8 text-gray-slate dark:text-gray-300">No members</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-light dark:border-gray-700">
                          <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">Name</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">Email</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">Role</th>
                        </tr>
                      </thead>
                      <tbody>
                        {members.map((member) => (
                          <tr key={member.user_id} className="border-b border-gray-light dark:border-gray-700">
                            <td className="py-3 px-4 text-gray-900 dark:text-white">{member.profiles?.name}</td>
                            <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{member.profiles?.email}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                member.role === 'SuperAdmin'
                                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                                  : member.role === 'Admin'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                                  : member.role === 'Editor'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                  : member.role === 'BillingContact'
                                  ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                              }`}>
                                {member.role === 'BillingContact' ? 'Billing Contact' : member.role === 'SuperAdmin' ? 'Super Admin' : member.role}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      </AdminLayout>
    </AdminProtectedRoute>
  );
}
