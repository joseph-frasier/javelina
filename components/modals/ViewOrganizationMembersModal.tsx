'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { adminApi } from '@/lib/api-client';
import { useToastStore } from '@/lib/toast-store';

interface OrganizationMember {
  user_id: string;
  name: string;
  email: string;
  role: string;
}

interface ViewOrganizationMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  organizationName?: string;
}

export function ViewOrganizationMembersModal({
  isOpen,
  onClose,
  organizationId,
  organizationName,
}: ViewOrganizationMembersModalProps) {
  const { addToast } = useToastStore();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<OrganizationMember[]>([]);

  useEffect(() => {
    if (isOpen && organizationId) {
      fetchMembers();
    }
  }, [isOpen, organizationId]);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getOrganizationMembers(organizationId);
      setMembers((data || []) as OrganizationMember[]);
    } catch (error: any) {
      console.error('Failed to fetch organization members:', error);
      addToast('error', error.message || 'Failed to load organization members');
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'SuperAdmin':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'Admin':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'Editor':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'BillingContact':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'Viewer':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const formatRoleName = (role: string) => {
    if (role === 'BillingContact') return 'Billing Contact';
    if (role === 'SuperAdmin') return 'Super Admin';
    return role;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${organizationName || 'Organization'} - Members`}
      size="large"
    >
      <div className="space-y-4">
        {loading ? (
          <div className="py-12 text-center">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
            </div>
            <p className="text-gray-slate dark:text-gray-300 mt-4">Loading members...</p>
          </div>
        ) : members.length === 0 ? (
          <div className="py-12 text-center">
            <svg
              className="w-16 h-16 mx-auto text-gray-300 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <p className="text-gray-slate dark:text-gray-300 text-lg font-medium">No members found</p>
            <p className="text-gray-400 text-sm mt-2">This organization has no members.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {members.length} {members.length === 1 ? 'member' : 'members'}
              </p>
            </div>

            {/* Mobile View - Cards */}
            <div className="sm:hidden space-y-3">
              {members.map((member) => (
                <div
                  key={member.user_id}
                  className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white truncate">
                        {member.name}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        {member.email}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${getRoleBadgeColor(member.role)}`}>
                      {formatRoleName(member.role)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View - Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-light dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">
                      Name
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">
                      Email
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">
                      Role
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr
                      key={member.user_id}
                      className="border-b border-gray-light dark:border-gray-700 last:border-b-0"
                    >
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {member.name}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {member.email}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(member.role)}`}>
                          {formatRoleName(member.role)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

