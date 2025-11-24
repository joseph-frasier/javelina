'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Dropdown from '@/components/ui/Dropdown';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'SuperAdmin' | 'Admin' | 'Editor' | 'Viewer';
  avatar?: string;
}

interface ManageTeamMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  organizationName: string;
}

export function ManageTeamMembersModal({
  isOpen,
  onClose,
  users,
  organizationName,
}: ManageTeamMembersModalProps) {
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<string>('');

  // Reset editing state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setEditingUserId(null);
      setEditingRole('');
    }
  }, [isOpen]);

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

  const handleEditRole = (userId: string, currentRole: string) => {
    setEditingUserId(userId);
    setEditingRole(currentRole);
  };

  const handleSaveRole = () => {
    // TODO: Save role change via API
    console.log(`Updating user ${editingUserId} to role ${editingRole}`);
    setEditingUserId(null);
    setEditingRole('');
  };

  const handleRemoveUser = (userId: string, userName: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to remove ${userName} from ${organizationName}?`
    );
    if (confirmed) {
      // TODO: Remove user via API
      console.log(`Removing user ${userId}`);
    }
  };

  const roleOptions = [
    { value: 'Viewer', label: 'Viewer - Can view only' },
    { value: 'Editor', label: 'Editor - Can view and edit' },
    { value: 'Admin', label: 'Admin - Can manage resources' },
    { value: 'SuperAdmin', label: 'SuperAdmin - Full access' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Manage Team Members - ${organizationName}`}
      size="large"
    >
      <div className="space-y-4">
        {/* Header Info */}
        <div className="bg-blue-electric/5 dark:bg-blue-electric/10 border border-blue-electric/20 rounded-lg p-4">
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
              {users.length} {users.length === 1 ? 'member' : 'members'}
            </span>
          </div>
        </div>

        {/* Users List */}
        <div className="space-y-3">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-4 rounded-lg bg-white dark:bg-gray-800 border border-gray-light dark:border-gray-slate"
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-12 h-12 rounded-full"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-orange/10 dark:bg-orange/20 flex items-center justify-center">
                      <span className="text-base font-bold text-orange">
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

                {/* Role Management */}
                <div className="flex items-center space-x-2 flex-shrink-0">
                  {editingUserId === user.id ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-48 relative z-[100]">
                        <Dropdown
                          value={editingRole}
                          onChange={setEditingRole}
                          options={roleOptions}
                        />
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleSaveRole}
                      >
                        Save
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingUserId(null);
                          setEditingRole('');
                        }}
                      >
                        ✕
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span
                        className={`text-xs px-3 py-1 rounded-full border font-medium ${getRoleColor(
                          user.role
                        )}`}
                      >
                        {user.role}
                      </span>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleEditRole(user.id, user.role)}
                        className="!bg-orange hover:!bg-orange-dark !text-white"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleRemoveUser(user.id, user.name)}
                        className="!bg-red-600 hover:!bg-red-700 !text-white"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t border-gray-light dark:border-gray-slate">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}

