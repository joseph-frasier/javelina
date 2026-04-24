'use client';

import { useState, useEffect, useCallback } from 'react';
import { Modal } from '@/components/ui/Modal';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
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

interface RemoveConfirm {
  userId: string;
  userName: string;
}

interface RevokeConfirm {
  invitation: Invitation;
}

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

  // Confirmation modal state
  const [removeConfirm, setRemoveConfirm] = useState<RemoveConfirm | null>(null);
  const [revokeConfirm, setRevokeConfirm] = useState<RevokeConfirm | null>(null);

  // Invitation state
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoadingInvitations, setIsLoadingInvitations] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      const resetTimer = window.setTimeout(() => {
        setEditingUserId(null);
        setEditingRole('');
        setActiveTab('members');
      }, 250);

      return () => window.clearTimeout(resetTimer);
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
    if (isOpen) {
      fetchInvitations();
    }
  }, [isOpen, fetchInvitations]);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'SuperAdmin':
        return 'bg-accent-soft text-accent border-accent/20';
      case 'Admin':
        return 'bg-blue-electric/10 text-blue-electric border-blue-electric/20';
      case 'BillingContact':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'Editor':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'Viewer':
        return 'bg-gray-slate/10 text-text-muted border-gray-slate/20';
      default:
        return 'bg-surface-alt/10 text-text-muted border-border/20';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400';
      case 'awaiting_verification':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400';
      default:
        return 'bg-surface-alt/10 text-text-muted border-border/20';
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

  const handleConfirmRemove = async () => {
    if (!removeConfirm) return;

    setIsLoading(true);
    try {
      await organizationsApi.removeMember(organizationId, removeConfirm.userId);
      addToast('success', `${removeConfirm.userName} has been removed from ${organizationName}`);
      setRemoveConfirm(null);
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

  const handleConfirmRevoke = async () => {
    if (!revokeConfirm) return;

    setIsRevoking(true);
    try {
      await organizationsApi.revokeInvitation(organizationId, revokeConfirm.invitation.id);
      addToast('success', `Invitation for ${revokeConfirm.invitation.email} has been revoked`);
      setRevokeConfirm(null);
      fetchInvitations();
    } catch (error: any) {
      console.error('Error revoking invitation:', error);
      const errorMessage = error?.message || error?.error || 'Failed to revoke invitation';
      addToast('error', errorMessage);
    } finally {
      setIsRevoking(false);
    }
  };

  const roleOptions = [
    { value: 'Viewer', label: 'Viewer - Can view only' },
    { value: 'Editor', label: 'Editor - Can manage DNS' },
    { value: 'BillingContact', label: 'Billing Contact - Can manage billing' },
    { value: 'Admin', label: 'Admin - Can manage resources' },
  ];

  const roleDistribution = users.reduce<Record<string, number>>((acc, user) => {
    acc[user.role] = (acc[user.role] || 0) + 1;
    return acc;
  }, {});

  const topRoleDistribution = Object.entries(roleDistribution)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Manage Team Access"
        eyebrow={organizationName}
        subtitle="Review who has access, adjust roles, and keep pending invitations moving without leaving this workspace."
        size="large"
        allowOverflow
        bodyClassName="space-y-6"
        headerContent={
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-text-muted dark:border-white/10 dark:bg-surface/5 dark:text-white/70">
              {users.length} member{users.length === 1 ? '' : 's'}
            </span>
            <span className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-text-muted dark:border-white/10 dark:bg-surface/5 dark:text-white/70">
              {invitations.length} pending invite{invitations.length === 1 ? '' : 's'}
            </span>
            {topRoleDistribution[0] && (
              <span className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-text-muted dark:border-white/10 dark:bg-surface/5 dark:text-white/70">
                Largest group: {topRoleDistribution[0][0]} ({topRoleDistribution[0][1]})
              </span>
            )}
          </div>
        }
        footer={
          <div className="flex justify-end">
            <Button variant="primary" onClick={onClose}>
              Close
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Tab Strip */}
          <div className="inline-flex rounded-full border border-border bg-gray-50 p-1 dark:border-white/10 dark:bg-surface/[0.04]">
            <button
              onClick={() => setActiveTab('members')}
              className={`rounded-full px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === 'members'
                  ? 'bg-accent text-white shadow-[0_10px_30px_rgba(239,114,21,0.28)]'
                  : 'text-text-muted hover:text-text/60 dark:hover:text-white'
              }`}
            >
              Members
              <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs ${activeTab === 'members' ? 'bg-surface/20 text-white' : 'bg-surface text-text-muted dark:bg-surface/10 dark:text-white/60'}`}>
                {users.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('invitations')}
              className={`rounded-full px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === 'invitations'
                  ? 'bg-accent text-white shadow-[0_10px_30px_rgba(239,114,21,0.28)]'
                  : 'text-text-muted hover:text-text/60 dark:hover:text-white'
              }`}
            >
              Pending Invitations
              {invitations.length > 0 && (
                <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs ${activeTab === 'invitations' ? 'bg-surface/20 text-white' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200'}`}>
                  {invitations.length}
                </span>
              )}
            </button>
          </div>

          {/* Members Tab */}
          {activeTab === 'members' && (
            <>
              <div className="grid gap-3 md:grid-cols-[1.3fr_1fr]">
                <div className="rounded-[22px] border border-blue-200 bg-blue-50 p-5 dark:border-blue-electric/20 dark:bg-blue-electric/10">
                  <div className="flex items-center gap-2 text-blue-electric">
                    <svg
                      className="h-5 w-5"
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
                    <span className="text-sm font-medium uppercase tracking-[0.24em]">Team overview</span>
                  </div>
                  <p className="mt-4 text-3xl font-semibold tracking-tight text-text">
                    {users.length} active member{users.length === 1 ? '' : 's'}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-text/65">
                    Keep access current by promoting the right people and removing unused seats quickly.
                  </p>
                </div>

                <div className="rounded-[22px] border border-border bg-surface p-5 shadow-sm dark:border-white/10 dark:bg-surface/[0.04] dark:shadow-none">
                  <p className="text-sm font-medium text-text dark:text-[#fff3ea]">Role distribution</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {topRoleDistribution.length > 0 ? (
                      topRoleDistribution.map(([roleName, count]) => (
                        <span
                          key={roleName}
                          className={`rounded-full border px-3 py-1 text-xs font-medium ${getRoleColor(roleName)}`}
                        >
                          {roleName} {count}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-text/55">No active members yet.</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Users List */}
              <div className="space-y-3">
                {users.map((user) => (
                  <div
                    key={user.user_id}
                    className="rounded-[22px] border border-border bg-surface p-4 shadow-sm transition-colors hover:border-accent/25 hover:bg-accent-soft dark:border-white/10 dark:bg-surface/[0.04] dark:shadow-none dark:hover:border-white/20 dark:hover:bg-surface/[0.06]"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex items-center space-x-3 min-w-0">
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        {user.avatar ? (
                          <img
                            src={user.avatar}
                            alt={user.name}
                            className="h-12 w-12 rounded-full"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-accent/20 bg-accent/15">
                            <span className="text-base font-bold text-accent">
                              {getInitials(user.name)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium text-text">
                          {user.name}
                        </p>
                        <p className="truncate text-sm text-text/55">
                          {user.email}
                        </p>
                      </div>
                      </div>

                      {/* Role Management */}
                      <div className="flex items-center gap-2 self-end lg:self-auto">
                        {editingUserId === user.user_id ? (
                          <div className="flex w-full flex-col gap-2 rounded-2xl border border-border bg-gray-50 p-2 sm:w-auto sm:flex-row sm:items-center dark:border-white/10 dark:bg-black/20">
                            <div className="relative z-[100] sm:w-48">
                              <Dropdown
                                value={editingRole}
                                onChange={setEditingRole}
                                options={roleOptions}
                              />
                            </div>
                            <div className="flex items-center gap-2">
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
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                  setEditingUserId(null);
                                  setEditingRole('');
                                }}
                                disabled={isLoading}
                              >
                                Cancel
                              </Button>
                            </div>
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
                              variant="primary"
                              size="sm"
                              onClick={() => handleEditRole(user.user_id, user.role)}
                              disabled={isLoading}
                            >
                              Edit role
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setRemoveConfirm({ userId: user.user_id, userName: user.name })
                              }
                              className="!border-red-200 !bg-transparent !text-red-600 hover:!bg-red-50 hover:!text-red-700 dark:!border-red-500/25 dark:!text-red-300 dark:hover:!bg-red-500/10 dark:hover:!text-red-200"
                              disabled={isLoading}
                            >
                              Remove
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
                <div className="rounded-[22px] border border-border bg-surface py-12 text-center shadow-sm dark:border-white/10 dark:bg-surface/[0.04] dark:shadow-none">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-accent"></div>
                </div>
              ) : invitations.length > 0 ? (
                <div className="space-y-3">
                  {invitations.map((invitation) => (
                    <div
                      key={invitation.id}
                      className="rounded-[22px] border border-border bg-surface p-4 shadow-sm transition-colors hover:border-accent/25 hover:bg-accent-soft dark:border-white/10 dark:bg-surface/[0.04] dark:shadow-none dark:hover:border-white/20 dark:hover:bg-surface/[0.06]"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-center space-x-3 min-w-0">
                        {/* Envelope Icon */}
                        <div className="flex-shrink-0">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-200 bg-amber-100 dark:border-amber-500/20 dark:bg-amber-500/15">
                            <svg
                              className="h-6 w-6 text-amber-600 dark:text-amber-300"
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
                          <p className="truncate text-sm font-medium text-text">
                            {invitation.email}
                          </p>
                          <p className="text-sm text-text/55">
                            Invited {formatRelativeDate(invitation.created_at)}
                            {invitation.invited_by_name && (
                              <span> by {invitation.invited_by_name}</span>
                            )}
                          </p>
                          {invitation.expires_at && (
                            <p className="text-sm text-text-muted/80 dark:text-white/45">
                              Expires:{' '}
                              {new Date(invitation.expires_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </p>
                          )}
                        </div>
                        </div>

                        {/* Status + Role Badges + Revoke */}
                        <div className="flex flex-wrap items-center gap-2 self-end lg:self-auto">
                          <div className="flex flex-wrap items-center gap-2">
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
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setRevokeConfirm({ invitation })}
                            className="!border-red-200 !bg-transparent !text-red-600 hover:!bg-red-50 hover:!text-red-700 dark:!border-red-500/25 dark:!text-red-300 dark:hover:!bg-red-500/10 dark:hover:!text-red-200"
                          >
                            Revoke
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-[22px] border border-dashed border-border bg-surface py-12 text-center shadow-sm dark:border-white/15 dark:bg-surface/[0.03] dark:shadow-none">
                  <svg
                    className="mx-auto mb-4 h-12 w-12 text-text-muted/40 dark:text-white/35"
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
                  <p className="text-base font-medium text-text">No pending invitations</p>
                  <p className="mt-2 text-sm text-text/55">
                    New invites will appear here until the recipient accepts.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </Modal>

      {/* Remove Member Confirmation */}
      <ConfirmationModal
        isOpen={removeConfirm !== null}
        onClose={() => setRemoveConfirm(null)}
        onConfirm={handleConfirmRemove}
        title="Remove Member"
        message={
          removeConfirm
            ? `Are you sure you want to remove ${removeConfirm.userName} from ${organizationName}? They will lose access immediately.`
            : ''
        }
        confirmText="Remove"
        variant="danger"
        isLoading={isLoading}
      />

      {/* Revoke Invitation Confirmation */}
      <ConfirmationModal
        isOpen={revokeConfirm !== null}
        onClose={() => setRevokeConfirm(null)}
        onConfirm={handleConfirmRevoke}
        title="Revoke Invitation"
        message={
          revokeConfirm
            ? `Are you sure you want to revoke the invitation for ${revokeConfirm.invitation.email}? The invite link will no longer work.`
            : ''
        }
        confirmText="Revoke"
        variant="danger"
        isLoading={isRevoking}
      />
    </>
  );
}
