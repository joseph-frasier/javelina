'use client';

import { useAuthStore } from '@/lib/auth-store';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { AvatarUpload } from '@/components/ui/AvatarUpload';
import { EditProfileModal } from '@/components/modals/EditProfileModal';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatDateWithRelative } from '@/lib/utils/time';

interface AuditLog {
  id: string;
  table_name: string;
  action: string;
  old_data: any;
  new_data: any;
  created_at: string;
}

export default function ProfilePage() {
  const { user, updateProfile } = useAuthStore();
  const [showEditModal, setShowEditModal] = useState(false);
  const [recentActivity, setRecentActivity] = useState<AuditLog[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);

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

  // Fetch recent activity from audit logs
  useEffect(() => {
    const fetchRecentActivity = async () => {
      setLoadingActivity(true);
      const supabase = createClient();
      
      // Fetch recent audit logs for the current user
      const { data: auditLogs } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('user_id', user.id)
        .in('table_name', ['zones', 'zone_records', 'dns_records', 'environments', 'organizations'])
        .order('created_at', { ascending: false })
        .limit(10);
      
      // Filter out environment updates and take top 3
      const meaningfulLogs = auditLogs?.filter(log => {
        if (log.table_name !== 'environments') return true;
        return log.action === 'INSERT' || log.action === 'DELETE';
      }) || [];
      
      setRecentActivity(meaningfulLogs.slice(0, 3));
      setLoadingActivity(false);
    };
    
    fetchRecentActivity();
  }, [user.id]);

  // Format audit log into human-readable activity
  const formatActivity = (log: AuditLog) => {
    const name = log.new_data?.name || log.old_data?.name || 'Unknown';
    const recordType = log.new_data?.type || log.old_data?.type;
    
    switch (log.table_name) {
      case 'zones':
        if (log.action === 'INSERT') return `Zone created: ${name}`;
        if (log.action === 'UPDATE') return `Zone updated: ${name}`;
        if (log.action === 'DELETE') return `Zone deleted: ${name}`;
        break;
      case 'zone_records':
      case 'dns_records':
        if (log.action === 'INSERT') return `DNS record added: ${recordType} record`;
        if (log.action === 'UPDATE') return `DNS record updated: ${recordType} record`;
        if (log.action === 'DELETE') return `DNS record deleted: ${recordType} record`;
        break;
      case 'environments':
        if (log.action === 'INSERT') return `Environment created: ${name}`;
        if (log.action === 'UPDATE') return `Environment updated: ${name}`;
        if (log.action === 'DELETE') return `Environment deleted: ${name}`;
        break;
      case 'organizations':
        if (log.action === 'INSERT') return `Organization created: ${name}`;
        if (log.action === 'UPDATE') return `Organization updated: ${name}`;
        if (log.action === 'DELETE') return `Organization deleted: ${name}`;
        break;
    }
    return `${log.table_name} ${log.action.toLowerCase()}`;
  };

  // Get color for activity based on action
  const getActivityColor = (action: string) => {
    switch (action) {
      case 'INSERT':
        return 'bg-green-500 dark:bg-green-400';
      case 'DELETE':
        return 'bg-red-500 dark:bg-red-400';
      case 'UPDATE':
        return 'bg-orange dark:bg-orange';
      default:
        return 'bg-blue-500 dark:bg-blue-400';
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
              <div className="py-12 flex items-center justify-center">
                <div className="text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                    />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                    No API keys yet
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Create an API key to get started with integrations
                  </p>
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
              {loadingActivity ? (
                <div className="py-12 flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange mx-auto"></div>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading activity...</p>
                  </div>
                </div>
              ) : recentActivity.length === 0 ? (
                <div className="py-12 flex items-center justify-center">
                  <div className="text-center">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                      No recent activity
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Your actions will appear here
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {recentActivity.map((log) => (
                    <div key={log.id} className="flex items-start gap-3">
                      <div className={`w-2 h-2 ${getActivityColor(log.action)} rounded-full mt-2 flex-shrink-0`}></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words">
                          {formatActivity(log)}
                        </p>
                        <p className="text-xs text-gray-slate dark:text-gray-400">
                          {formatDateWithRelative(log.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
