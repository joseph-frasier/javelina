'use client';

import { useState, useEffect, useCallback } from 'react';
import { Modal } from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Dropdown from '@/components/ui/Dropdown';
import { organizationsApi } from '@/lib/api-client';
import type { Invitation } from '@/lib/api-client';
import { useToastStore } from '@/lib/toast-store';

interface User {
  user_id: string;
  name: string;
  email: string;
  role: 'SuperAdmin' | 'Admin' | 'BillingContact' | 'Editor' | 'Viewer';
  avatar?: string;
}

interface ManageTeamMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  organizationName: string;
  organizationId: string;
  onMemberUpdated?: () => void;
  onMemberRemoved?: () => void;
}

type Tab = 'members' | 'invitations';

export function ManageTeamMembersModal({
  isOpen,
  onClose,
  users,
  organizationName,
  organizationId,
  onMemberUpdated,
  onMemberRemoved,
}: ManageTeamMembersModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('members');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const addToast = useToastStore((state) => state.addToast);

  // Invitation state
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoadingInvitations, setIsLoadingInvitations] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setEditingUserId(null);
      setEditingRole('');
      setActiveTab('members');
    }
  }, [isOpen]);

  const fetchInvitations = useCallback(async () => {
    setIsLoadingInvitations(true);
    try {
      const data = await organizationsApi.getInvitations(organizationId);
      setInvitations(data || []);
    } catch (error) {
      console.error('Error fetching invitations:', error);
      setInvitations([]);
    } finally {
      setIsLoadingInvitations(false);
    }
  }, [organizationId]);

  useEffect(() => {
    if (isOpen && activeTab === 'invitations') {
      fetchInvitations();
    }
  }, [isOpen, activeTab, fetchInvitations]);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'SuperAdmin':
        return 'bg-orange/10 text-orange border-orange/20';
      case 'Admin':
        return 'bg-blue-electric/10 text-blue-electric border-blue-electric/20';
      case 'BillingContact':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'Editor':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'Viewer':
        return 'bg-gray-slate/10 text-gray-slate border-gray-slate/20';
      default:
        return 'bg-gray-light/10 text-gray-slate border-gray-light/20';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400';
      case 'awaiting_verification':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400';
      default:
        return 'bg-gray-light/10 text-gray-slate border-gray-light/20';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'awaiting_verification':
        return 'Awaiting Verification';
      default:
        return status;
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

  const formatRelativeDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleEditRole = (userId: string, currentRole: string) => {
    setEditingUserId(userId);
    setEditingRole(currentRole);
  };

  const handleSaveRole = async () => {
    if (!editingUserId || !editingRole) return;
    
    setIsLoading(true);
    try {
      await organizationsApi.updateMemberRole(
        organizationId,
        editingUserId,
        editingRole as 'Admin' | 'Editor' | 'BillingContact' | 'Viewer'
      );
      
      addToast('success', 'Member role updated successfully');
      setEditingUserId(null);
      setEditingRole('');
      
      if (onMemberUpdated) {
        onMemberUpdated();
      }
    } catch (error: any) {
      console.error('Error updating member role:', error);
      const errorMessage = error?.message || error?.error || 'Failed to update member role';
      addToast('error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveUser = async (userId: string, userName: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to remove ${userName} from ${organizationName}?`
    );
    if (!confirmed) return;
    
    setIsLoading(true);
    try {
      await organizationsApi.removeMember(organizationId, userId);
      
      addToast('success', `${userName} has been removed from ${organizationName}`);
      
      if (onMemberRemoved) {
        onMemberRemoved();
      }
    } catch (error: any) {
      console.error('Error removing member:', error);
      const errorMessage = error?.message || error?.error || 'Failed to remove member';
      addToast('error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevokeInvitation = async (invitation: Invitation) => {
    const confirmed = window.confirm(
      `Are you sure you want to revoke the invitation for ${invitation.email}?`
    );
    if (!confirmed) return;

    setRevokingId(invitation.id);
    try {
      await organizationsApi.revokeInvitation(organizationId, invitation.id);
      addToast('success', `Invitation for ${invitation.email} has been revoked`);
      fetchInvitations();
    } catch (error: any) {
      console.error('Error revoking invitation:', error);
      const errorMessage = error?.message || error?.error || 'Failed to revoke invitation';
      addToast('error', errorMessage);
    } finally {
      setRevokingId(null);
    }
  };

  const roleOptions = [
    { value: 'Viewer', label: 'Viewer - Can view only' },
    { value: 'Editor', label: 'Editor - Can manage DNS' },
    { value: 'BillingContact', label: 'Billing Contact - Can manage billing' },
    { value: 'Admin', label: 'Admin - Can manage resources' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Manage Team - ${organizationName}`}
      size="large"
    >
      <div className="space-y-4">
        {/* Tab Strip */}
        <div className="flex border-b border-gray-light dark:border-gray-slate">
          <button
            onClick={() => setActiveTab('members')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'members'
                ? 'border-orange text-orange'
                : 'border-transparent text-gray-slate dark:text-gray-light hover:text-gray-slate dark:hover:text-white'
            }`}
          >
            Members
            <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full bg-gray-light/30 dark:bg-gray-slate/30">
              {users.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('invitations')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'invitations'
                ? 'border-orange text-orange'
                : 'border-transparent text-gray-slate dark:text-gray-light hover:text-gray-slate dark:hover:text-white'
            }`}
          >
            Pending Invitations
            {invitations.length > 0 && (
              <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">
                {invitations.length}
              </span>
            )}
          </button>
        </div>

        {/* Members Tab */}
        {activeTab === 'members' && (
          <>
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
                  key={user.user_id}
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
                      {editingUserId === user.user_id ? (
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
                            loading={isLoading}
                            disabled={isLoading}
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
                            disabled={isLoading}
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
                            onClick={() => handleEditRole(user.user_id, user.role)}
                            className="!bg-orange hover:!bg-orange-dark !text-white"
                            disabled={isLoading}
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
                            onClick={() => handleRemoveUser(user.user_id, user.name)}
                            className="!bg-red-600 hover:!bg-red-700 !text-white"
                            disabled={isLoading}
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
          </>
        )}

        {/* Pending Invitations Tab */}
        {activeTab === 'invitations' && (
          <>
            {isLoadingInvitations ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange"></div>
              </div>
            ) : invitations.length > 0 ? (
              <div className="space-y-3">
                {invitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-white dark:bg-gray-800 border border-gray-light dark:border-gray-slate"
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      {/* Envelope Icon */}
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 rounded-full bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center">
                          <svg
                            className="w-6 h-6 text-amber-600 dark:text-amber-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                      </div>

                      {/* Invite Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-slate dark:text-white truncate">
                          {invitation.email}
                        </p>
                        <p className="text-xs text-gray-slate dark:text-gray-light">
                          Invited {formatRelativeDate(invitation.created_at)}
                          {invitation.invited_by_name && (
                            <span> by {invitation.invited_by_name}</span>
                          )}
                        </p>
                        {invitation.expires_at && (
                          <p className="text-xs text-gray-slate dark:text-gray-light">
                            Expires:{' '}
                            {new Date(invitation.expires_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </p>
                        )}
                      </div>

                      {/* Status + Role Badges */}
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <span
                          className={`text-xs px-2 py-1 rounded-full border font-medium ${getStatusColor(
                            invitation.status
                          )}`}
                        >
                          {getStatusLabel(invitation.status)}
                        </span>
                        <span
                          className={`text-xs px-2 py-1 rounded-full border font-medium ${getRoleColor(
                            invitation.role
                          )}`}
                        >
                          {invitation.role}
                        </span>

                        {/* Revoke Button */}
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleRevokeInvitation(invitation)}
                          className="!bg-red-600 hover:!bg-red-700 !text-white"
                          disabled={revokingId === invitation.id}
                          loading={revokingId === invitation.id}
                        >
                          Revoke
                        </Button>
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
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                <p className="text-sm text-gray-slate dark:text-gray-light">
                  No pending invitations
                </p>
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-4">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
