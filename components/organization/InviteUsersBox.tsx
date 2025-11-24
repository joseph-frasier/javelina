'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { InviteUsersModal } from '@/components/modals/InviteUsersModal';
import { ManageTeamMembersModal } from '@/components/modals/ManageTeamMembersModal';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'SuperAdmin' | 'Admin' | 'Editor' | 'Viewer';
  avatar?: string;
}

interface InviteUsersBoxProps {
  organizationId: string;
  organizationName: string;
}

export function InviteUsersBox({ organizationId, organizationName }: InviteUsersBoxProps) {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch actual users from API when backend is ready
    // For now, using mock data
    const fetchUsers = async () => {
      setIsLoading(true);
      try {
        // Mock API call
        await new Promise((resolve) => setTimeout(resolve, 500));
        
        // Mock users data
        const mockUsers: User[] = [
          {
            id: '1',
            name: 'Current User',
            email: 'user@example.com',
            role: 'SuperAdmin',
          },
        ];
        
        setUsers(mockUsers);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [organizationId]);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'SuperAdmin':
        return 'bg-orange/10 text-orange border-orange/20';
      case 'Admin':
        return 'bg-blue-electric/10 text-blue-electric border-blue-electric/20';
      case 'Editor':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'Viewer':
        return 'bg-gray-slate/10 text-gray-slate border-gray-slate/20';
      default:
        return 'bg-gray-light/10 text-gray-slate border-gray-light/20';
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <Card
        title="Team Members"
        description="Manage users and permissions"
        action={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsManageModalOpen(true)}
          >
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            Manage
          </Button>
        }
      >
        <div className="space-y-4 mt-4">
          {/* User Count Summary */}
          <div className="flex items-center justify-between p-3 bg-blue-electric/5 dark:bg-blue-electric/10 rounded-lg border border-blue-electric/20">
            <div className="flex items-center space-x-2">
              <svg
                className="w-5 h-5 text-blue-electric"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <span className="text-sm font-medium text-gray-slate dark:text-white">
                {isLoading ? 'Loading...' : `${users.length} ${users.length === 1 ? 'member' : 'members'}`}
              </span>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsInviteModalOpen(true)}
            >
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Invite
            </Button>
          </div>

          {/* Users List */}
          {isLoading ? (
            <div className="text-center py-4">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange"></div>
            </div>
          ) : users.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-light dark:border-gray-slate hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-orange/10 dark:bg-orange/20 flex items-center justify-center">
                          <span className="text-sm font-bold text-orange">
                            {getInitials(user.name)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-slate dark:text-white truncate">
                        {user.name}
                      </p>
                      <p className="text-xs text-gray-slate dark:text-gray-light truncate">
                        {user.email}
                      </p>
                    </div>

                    {/* Role Badge */}
                    <div className="flex-shrink-0">
                      <span
                        className={`text-xs px-2 py-1 rounded-full border font-medium ${getRoleColor(
                          user.role
                        )}`}
                      >
                        {user.role}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <svg
                className="w-12 h-12 text-gray-slate dark:text-gray-light mx-auto mb-3 opacity-50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
              <p className="text-sm text-gray-slate dark:text-gray-light">
                No team members yet
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Invite Users Modal */}
      <InviteUsersModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        organizationId={organizationId}
        organizationName={organizationName}
      />

      {/* Manage Team Members Modal */}
      <ManageTeamMembersModal
        isOpen={isManageModalOpen}
        onClose={() => setIsManageModalOpen(false)}
        users={users}
        organizationName={organizationName}
      />
    </>
  );
}

