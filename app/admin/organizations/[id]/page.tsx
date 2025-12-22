'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminProtectedRoute } from '@/components/admin/AdminProtectedRoute';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import {
  addMemberToOrganization,
  removeMemberFromOrganization,
  changeMemberRole
} from '@/lib/actions/admin/organizations';
import { useToastStore } from '@/lib/toast-store';
import Link from 'next/link';

interface Organization {
  id: string;
  name: string;
  description?: string;
  created_at: string;
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
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddMember, setShowAddMember] = useState(false);
  const [addMemberEmail, setAddMemberEmail] = useState('');
  const [addMemberRole, setAddMemberRole] = useState('Viewer');
  const [isAddingMember, setIsAddingMember] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const client = createServiceRoleClient();

      // Fetch organization
      const { data: orgData } = await client
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single();

      setOrg(orgData);

      // Fetch members with user profiles
      const { data: membersData } = await client
        .from('organization_members')
        .select('*, profiles:user_id(name, email)')
        .eq('organization_id', orgId);

      setMembers((membersData || []) as any[]);

      // Fetch zones directly for this organization
      const { data: zonesData } = await client
        .from('zones')
        .select('id, name, organization_id, live')
        .eq('organization_id', orgId)
        .is('deleted_at', null);

      setZones((zonesData || []) as Zone[]);
    } catch (error) {
      console.error('Failed to fetch organization data:', error);
      addToast('error', 'Failed to fetch organization data');
    } finally {
      setLoading(false);
    }
  }, [orgId, addToast]);

  useEffect(() => {
    if (orgId) {
      fetchData();
    }
  }, [orgId, fetchData]);

  const handleAddMember = async () => {
    if (!addMemberEmail.trim()) {
      addToast('error', 'Email is required');
      return;
    }

    setIsAddingMember(true);
    try {
      // Find user by email
      const client = createServiceRoleClient();
      const { data: user } = await client
        .from('profiles')
        .select('id')
        .eq('email', addMemberEmail)
        .single();

      if (!user) {
        addToast('error', 'User not found');
        return;
      }

      const result = await addMemberToOrganization(orgId, user.id, addMemberRole);
      if (result.error) {
        addToast('error', result.error);
      } else {
        addToast('success', 'Member added successfully');
        setAddMemberEmail('');
        setShowAddMember(false);
        await fetchData();
      }
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;

    try {
      const result = await removeMemberFromOrganization(orgId, userId);
      if (result.error) {
        addToast('error', result.error);
      } else {
        addToast('success', 'Member removed successfully');
        setMembers(members.filter(m => m.user_id !== userId));
      }
    } catch (error) {
      addToast('error', 'Failed to remove member');
    }
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    try {
      const result = await changeMemberRole(orgId, userId, newRole);
      if (result.error) {
        addToast('error', result.error);
      } else {
        addToast('success', 'Role updated successfully');
        setMembers(
          members.map(m =>
            m.user_id === userId ? { ...m, role: newRole } : m
          )
        );
      }
    } catch (error) {
      addToast('error', 'Failed to update role');
    }
  };

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
            <h1 className="text-3xl font-bold text-orange-dark">{org.name}</h1>
            {org.description && (
              <p className="text-gray-slate mt-2">{org.description}</p>
            )}
          </div>

          {/* Tabs */}
          <Card className="p-6">
            <div className="flex gap-4 mb-6 border-b border-gray-light pb-4">
              {['overview', 'members', 'zones'].map((tab) => (
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
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-slate">Members</p>
                    <p className="text-2xl font-bold text-orange-dark mt-2">{members.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-slate">Zones</p>
                    <p className="text-2xl font-bold text-orange-dark mt-2">{zones.length}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Members Tab */}
            {activeTab === 'members' && (
              <div className="space-y-6">
                <Button
                  variant="primary"
                  onClick={() => setShowAddMember(!showAddMember)}
                >
                  {showAddMember ? 'Cancel' : '+ Add Member'}
                </Button>

                {showAddMember && (
                  <Card className="p-4 bg-orange-50">
                    <div className="space-y-3">
                      <Input
                        type="email"
                        placeholder="Enter member email..."
                        value={addMemberEmail}
                        onChange={(e) => setAddMemberEmail(e.target.value)}
                      />
                      <select
                        value={addMemberRole}
                        onChange={(e) => setAddMemberRole(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-light rounded-md"
                      >
                        <option value="Viewer">Viewer</option>
                        <option value="Editor">Editor</option>
                        <option value="BillingContact">Billing Contact</option>
                        <option value="Admin">Admin</option>
                        <option value="SuperAdmin">Super Admin</option>
                      </select>
                      <Button
                        variant="primary"
                        disabled={isAddingMember}
                        onClick={handleAddMember}
                      >
                        Add Member
                      </Button>
                    </div>
                  </Card>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-light">
                        <th className="text-left py-3 px-4 font-semibold">Name</th>
                        <th className="text-left py-3 px-4 font-semibold">Email</th>
                        <th className="text-left py-3 px-4 font-semibold">Role</th>
                        <th className="text-right py-3 px-4 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map((member) => (
                        <tr key={member.user_id} className="border-b border-gray-light">
                          <td className="py-3 px-4">{member.profiles?.name}</td>
                          <td className="py-3 px-4">{member.profiles?.email}</td>
                          <td className="py-3 px-4">
                            <select
                              value={member.role}
                              onChange={(e) => handleChangeRole(member.user_id, e.target.value)}
                              className="px-2 py-1 border border-gray-light rounded text-sm"
                            >
                              <option value="Viewer">Viewer</option>
                              <option value="Editor">Editor</option>
                              <option value="BillingContact">Billing Contact</option>
                              <option value="Admin">Admin</option>
                              <option value="SuperAdmin">Super Admin</option>
                            </select>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              className="!text-red-600"
                              onClick={() => handleRemoveMember(member.user_id)}
                            >
                              Remove
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Zones Tab */}
            {activeTab === 'zones' && (
              <div>
                {zones.length === 0 ? (
                  <p className="text-center py-8 text-gray-slate">No zones</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-light">
                          <th className="text-left py-3 px-4 font-semibold">Name</th>
                          <th className="text-left py-3 px-4 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {zones.map((zone) => (
                          <tr key={zone.id} className="border-b border-gray-light">
                            <td className="py-3 px-4">{zone.name}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded text-xs ${zone.live ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                {zone.live ? 'Live' : 'Flagged'}
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
