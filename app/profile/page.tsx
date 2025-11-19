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
  const [isCompactView, setIsCompactView] = useState(false);

  const handleAvatarUpdate = (avatarUrl: string | null) => {
    updateProfile({ avatar_url: avatarUrl ?? undefined });
  };

  // Sort organizations by most recent (reverse order)
  const sortedOrganizations = user?.organizations ? [...user.organizations].reverse() : [];

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

  // Early return after all hooks
  if (!user) return null;

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

          </div>

          {/* Main Content */}
          <div className="flex-1 space-y-4 sm:space-y-6">
            {/* Organization Membership */}
            <Card className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h3 className="text-lg sm:text-xl font-semibold text-orange-dark dark:text-orange">
                  Organization Membership
                  <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                    ({sortedOrganizations.length})
                  </span>
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCompactView(!isCompactView)}
                  className="text-xs"
                >
                  {isCompactView ? 'Expanded' : 'Compact'}
                </Button>
              </div>
              <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
                {sortedOrganizations.map((org) => (
                  <div 
                    key={org.id} 
                    className={`border border-gray-light dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 ${
                      isCompactView ? 'p-2 sm:p-3' : 'p-3 sm:p-4'
                    }`}
                  >
                    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${isCompactView ? 'mb-1' : 'mb-2'}`}>
                      <h4 className={`font-medium text-orange-dark dark:text-orange break-words ${isCompactView ? 'text-sm' : ''}`}>
                        {org.name}
                      </h4>
                      <span className={`text-xs px-2 py-1 rounded-full border ${getRoleBadgeColor(org.role)} flex-shrink-0 self-start sm:self-auto`}>
                        {getRoleDisplayText(org.role)}
                      </span>
                    </div>
                    {!isCompactView && (
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm text-gray-slate dark:text-gray-400 mb-3">
                        <span>{org.environments_count} environments</span>
                        <span>{org.environments?.reduce((sum, env) => sum + env.zones_count, 0) || 0} zones</span>
                      </div>
                    )}
                    <div className={`flex flex-col sm:flex-row gap-2 ${isCompactView ? 'mt-2' : ''}`}>
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
