'use client';

import { useAuthStore } from '@/lib/auth-store';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { AvatarUpload } from '@/components/ui/AvatarUpload';
import { EditProfileModal } from '@/components/modals/EditProfileModal';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const router = useRouter();
  const { user, updateProfile } = useAuthStore();
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const orgSectionRef = useRef<HTMLDivElement>(null);

  const handleAvatarUpdate = (avatarUrl: string | null) => {
    updateProfile({ avatar_url: avatarUrl ?? undefined });
  };

  const handleGoToOrg = (orgId: string) => {
    router.push(`/organization/${orgId}`);
  };

  // Sort organizations by most recent (reverse order)
  const sortedOrganizations = user?.organizations ? [...user.organizations].reverse() : [];
  
  // Pagination logic
  const totalPages = Math.ceil(sortedOrganizations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedOrganizations = sortedOrganizations.slice(startIndex, endIndex);

  // Scroll to top on page load
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Scroll to top when page changes
  useEffect(() => {
    if (orgSectionRef.current) {
      orgSectionRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start'
      });
    }
  }, [currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
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
            <div ref={orgSectionRef}>
            <Card className="p-4 sm:p-6">
              <div className="mb-4 sm:mb-6">
                <h3 className="text-lg sm:text-xl font-semibold text-orange-dark dark:text-orange">
                  Organization Membership
                  <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                    ({startIndex + 1}-{Math.min(endIndex, sortedOrganizations.length)} of {sortedOrganizations.length})
                  </span>
                </h3>
              </div>
              <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
                {paginatedOrganizations.map((org) => (
                  <div 
                    key={org.id} 
                    className="border border-gray-light dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 p-3 sm:p-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                      <h4 className="font-medium text-orange-dark dark:text-orange break-words">
                        {org.name}
                      </h4>
                      <span className={`text-xs px-2 py-1 rounded-full border ${getRoleBadgeColor(org.role)} flex-shrink-0 self-start sm:self-auto`}>
                        {getRoleDisplayText(org.role)}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="justify-center"
                        onClick={() => handleGoToOrg(org.id)}
                      >
                        Go to Org
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t border-gray-light dark:border-gray-700">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </Button>
                  
                  <span className="text-sm text-gray-600 dark:text-gray-400 font-medium px-4">
                    Page {currentPage} of {totalPages}
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </Button>
                </div>
              )}
            </Card>
            </div>

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
