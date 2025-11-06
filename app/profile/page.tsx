'use client';

import { useAuthStore } from '@/lib/auth-store';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { AvatarUpload } from '@/components/ui/AvatarUpload';
import { EditProfileModal } from '@/components/modals/EditProfileModal';
import { useState } from 'react';

export default function ProfilePage() {
  const { user, updateProfile } = useAuthStore();
  const [showEditModal, setShowEditModal] = useState(false);

  if (!user) return null;

  const handleAvatarUpdate = (avatarUrl: string | null) => {
    updateProfile({ avatar_url: avatarUrl ?? undefined });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'SuperAdmin':
        return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-700';
      case 'Admin':
        return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-700';
      case 'Editor':
        return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-700';
      case 'Viewer':
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600';
    }
  };

  const getRoleDisplayText = (role: string) => {
    switch (role) {
      case 'SuperAdmin':
        return 'SuperUser';
      default:
        return role;
    }
  };

  return (
    <ProtectedRoute>
      <div className="p-4 sm:p-6 md:p-8">
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-8">
          {/* Left Sidebar - Full width on mobile, 320px on desktop */}
          <div className="w-full lg:w-80 flex-shrink-0 space-y-4 sm:space-y-6">
            {/* Profile Card */}
            <Card className="p-4 sm:p-6">
              <div className="flex flex-col items-center text-center">
                <div className="mb-4">
                  <AvatarUpload
                    currentAvatarUrl={user.avatar_url}
                    userInitial={user.name.charAt(0).toUpperCase()}
                    userId={user.id}
                    onAvatarUpdate={handleAvatarUpdate}
                  />
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-orange-dark dark:text-orange mb-1">
                  {user.name}
                </h2>
                <p className="text-sm text-gray-slate dark:text-gray-300 mb-2 break-words">
                  {user.email}
                </p>
                {user.title && (
                  <p className="text-sm text-gray-slate dark:text-gray-300 mb-2">
                    {user.title}
                  </p>
                )}
                {user.role === 'superuser' && (
                  <p className="text-sm font-semibold text-orange dark:text-orange mb-4">
                    SuperUser
                  </p>
                )}
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowEditModal(true)}
                    className="flex-1 sm:flex-none"
                  >
                    Edit Profile
                  </Button>
                </div>
              </div>
            </Card>

            {/* Admin Controls Card */}
            {(user.role === 'superuser' || user.organizations?.some(org => org.role === 'Admin' || org.role === 'SuperAdmin')) && (
              <Card className="p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold text-orange-dark dark:text-orange mb-3 sm:mb-4 text-center">
                  Admin Controls
                </h3>
                <div className="space-y-2 sm:space-y-3">
                  <Button variant="outline" size="sm" className="w-full justify-center">
                    Manage Members
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-center">
                    Invite Users
                  </Button>
                  {user.role === 'superuser' && (
                    <>
                      <Button variant="outline" size="sm" className="w-full justify-center">
                        Set Primary Domain
                      </Button>
                      <Button variant="outline" size="sm" className="w-full justify-center">
                        Resolve Conflicts
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            )}
          </div>

          {/* Main Content */}
          <div className="flex-1 space-y-4 sm:space-y-6">
            {/* Organization Membership */}
            <Card className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                <h3 className="text-lg sm:text-xl font-semibold text-orange-dark dark:text-orange">
                  Organization Membership
                </h3>
                <Button variant="outline" size="sm" className="w-full sm:w-auto justify-center">
                  Manage Organizations
                </Button>
              </div>
              <div className="grid gap-3 sm:gap-4">
                {user.organizations?.map((org) => (
                  <div key={org.id} className="border border-gray-light dark:border-gray-700 rounded-lg p-3 sm:p-4 bg-white dark:bg-gray-800">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <h4 className="font-medium text-orange-dark dark:text-orange break-words">{org.name}</h4>
                      <span className={`text-xs px-2 py-1 rounded-full border ${getRoleBadgeColor(org.role)} flex-shrink-0 self-start sm:self-auto`}>
                        {getRoleDisplayText(org.role)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm text-gray-slate dark:text-gray-400 mb-3">
                      <span>{org.environments_count} environments</span>
                      <span>{org.environments?.reduce((sum, env) => sum + env.zones_count, 0) || 0} zones</span>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button variant="outline" size="sm" className="justify-center">
                        Go to Org
                      </Button>
                      {(org.role === 'Admin' || org.role === 'SuperAdmin') && (
                        <Button variant="outline" size="sm" className="justify-center">
                          Manage
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* API Keys */}
            <Card className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                <h3 className="text-lg sm:text-xl font-semibold text-orange-dark dark:text-orange">
                  API Keys
                </h3>
                <Button variant="primary" size="sm" className="w-full sm:w-auto justify-center">
                  Create API Key
                </Button>
              </div>
              <div className="space-y-3">
                <div className="border border-gray-light dark:border-gray-700 rounded-lg p-3 sm:p-4 bg-white dark:bg-gray-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 break-words">CI Integration</h4>
                      <p className="text-sm text-gray-slate dark:text-gray-400">Created Jun 1, 2025</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
                      <Button variant="outline" size="sm" className="justify-center">
                        Rotate
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-600 dark:text-red-400 justify-center">
                        Revoke
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="border border-gray-light dark:border-gray-700 rounded-lg p-3 sm:p-4 bg-white dark:bg-gray-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 break-words">CLI</h4>
                      <p className="text-sm text-gray-slate dark:text-gray-400">Created Jul 3, 2025</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
                      <Button variant="outline" size="sm" className="justify-center">
                        Rotate
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-600 dark:text-red-400 justify-center">
                        Revoke
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Activity Feed */}
            <Card className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                <h3 className="text-lg sm:text-xl font-semibold text-orange-dark dark:text-orange">
                  Recent Activity
                </h3>
                <Button variant="outline" size="sm" className="w-full sm:w-auto justify-center">
                  Export Activity
                </Button>
              </div>
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-500 dark:bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words">Enabled MFA</p>
                    <p className="text-xs text-gray-slate dark:text-gray-400">Sep 30, 2025 at 12:34 PM</p>
                    <p className="text-xs text-gray-slate dark:text-gray-400">Company Corp</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words">Created DNS zone example.com</p>
                    <p className="text-xs text-gray-slate dark:text-gray-400">Sep 28, 2025 at 9:01 AM</p>
                    <p className="text-xs text-gray-slate dark:text-gray-400">Company Corp • example.com</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-orange dark:bg-orange rounded-full mt-2 flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words">Updated DNS record</p>
                    <p className="text-xs text-gray-slate dark:text-gray-400">Sep 25, 2025 at 2:15 PM</p>
                    <p className="text-xs text-gray-slate dark:text-gray-400">Company Corp • api.example.com</p>
                  </div>
                </div>
              </div>
            </Card>

          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
      />
    </ProtectedRoute>
  );
}
