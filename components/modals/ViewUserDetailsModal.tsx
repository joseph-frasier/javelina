'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { adminApi } from '@/lib/api-client';
import { useToastStore } from '@/lib/toast-store';
import { formatDateWithRelative } from '@/lib/utils/time';

interface UserDetails {
  id: string;
  name: string;
  display_name?: string;
  email: string;
  title?: string;
  phone?: string;
  timezone?: string;
  bio?: string;
  status?: string;
  created_at: string;
  last_login?: string;
}

interface ViewUserDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName?: string;
  userData?: UserDetails | null;
}

export function ViewUserDetailsModal({
  isOpen,
  onClose,
  userId,
  userName,
  userData,
}: ViewUserDetailsModalProps) {
  const { addToast } = useToastStore();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<UserDetails | null>(null);

  // Use provided userData if available, otherwise fetch
  useEffect(() => {
    if (isOpen && userId) {
      if (userData) {
        setUser(userData);
        setLoading(false);
      } else {
        fetchUserDetails();
      }
    }
  }, [isOpen, userId, userData]);

  const fetchUserDetails = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getUser(userId);
      setUser(data as UserDetails);
    } catch (error: any) {
      console.error('Failed to fetch user details:', error);
      addToast('error', error.message || 'Failed to load user details');
    } finally {
      setLoading(false);
    }
  };

  const InfoRow = ({ label, value }: { label: string; value: string | number | undefined | null }) => {
    if (value === undefined || value === null || value === '') {
      return null;
    }
    
    return (
      <div className="grid grid-cols-3 gap-4 py-3 border-b border-gray-light dark:border-gray-700 last:border-b-0">
        <div className="col-span-1 text-sm font-medium text-gray-600 dark:text-gray-400">
          {label}
        </div>
        <div className="col-span-2 text-sm text-gray-900 dark:text-gray-100 break-words">
          {value}
        </div>
      </div>
    );
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const isActive = status === 'active' || !status;
    
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
          isActive
            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
        }`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-600' : 'bg-red-600'}`} />
        {isActive ? 'Active' : 'Disabled'}
      </span>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={userName || 'User Details'}
      size="large"
    >
      <div className="space-y-6">
        {loading ? (
          <div className="py-12 text-center">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
            </div>
            <p className="text-gray-slate dark:text-gray-300 mt-4">Loading user details...</p>
          </div>
        ) : user ? (
          <>
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-semibold text-orange-dark dark:text-orange mb-4">
                Basic Information
              </h3>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <InfoRow label="Name" value={user.name} />
                <InfoRow label="ID" value={user.id} />
                <InfoRow label="Display Name" value={user.display_name} />
                <InfoRow label="Email" value={user.email} />
                <div className="grid grid-cols-3 gap-4 py-3 border-b border-gray-light dark:border-gray-700 last:border-b-0">
                  <div className="col-span-1 text-sm font-medium text-gray-600 dark:text-gray-400">
                    Status
                  </div>
                  <div className="col-span-2">
                    <StatusBadge status={user.status || 'active'} />
                  </div>
                </div>
              </div>
            </div>

            {/* Contact & Profile Information */}
            <div>
              <h3 className="text-lg font-semibold text-orange-dark dark:text-orange mb-4">
                Contact & Profile
              </h3>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <InfoRow label="Title" value={user.title} />
                <InfoRow label="Phone" value={user.phone} />
                <InfoRow label="Timezone" value={user.timezone} />
                {user.bio && (
                  <div className="grid grid-cols-3 gap-4 py-3 border-b border-gray-light dark:border-gray-700 last:border-b-0">
                    <div className="col-span-1 text-sm font-medium text-gray-600 dark:text-gray-400">
                      Bio
                    </div>
                    <div className="col-span-2 text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">
                      {user.bio}
                    </div>
                  </div>
                )}
                {(!user.title && !user.phone && !user.timezone && !user.bio) && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic py-3">
                    No additional profile information available
                  </p>
                )}
              </div>
            </div>

            {/* Account Activity */}
            <div>
              <h3 className="text-lg font-semibold text-orange-dark dark:text-orange mb-4">
                Account Activity
              </h3>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <InfoRow 
                  label="Created" 
                  value={user.created_at ? formatDateWithRelative(user.created_at).absolute : undefined} 
                />
                <InfoRow 
                  label="Last Login" 
                  value={user.last_login ? formatDateWithRelative(user.last_login).absolute : 'Never'} 
                />
              </div>
            </div>
          </>
        ) : (
          <div className="py-12 text-center">
            <p className="text-gray-slate dark:text-gray-300">User not found</p>
          </div>
        )}
      </div>
    </Modal>
  );
}

