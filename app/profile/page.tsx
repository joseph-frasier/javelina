'use client';

import { useAuthStore } from '@/lib/auth-store';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useState } from 'react';

export default function ProfilePage() {
  const { user } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);

  if (!user) return null;

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
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Admin':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Editor':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Viewer':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <ProtectedRoute>
      <div className="p-8">
        <div className="flex gap-8">
          {/* Left Sidebar - 320px */}
          <div className="w-80 flex-shrink-0 space-y-6">
            {/* Profile Card */}
            <Card className="p-6">
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-orange rounded-full flex items-center justify-center mb-4">
                  <span className="text-white text-2xl font-bold">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-orange-dark mb-1">
                  {user.name}
                </h2>
                <p className="text-sm text-gray-slate mb-2">
                  {user.email}
                </p>
                {user.title && (
                  <p className="text-sm text-gray-slate mb-4">
                    {user.title}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(!isEditing)}
                  >
                    {isEditing ? 'Cancel' : 'Edit Profile'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                  >
                    Change Password
                  </Button>
                </div>
              </div>
            </Card>

            {/* Security Card */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-orange-dark mb-4">
                Security
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-slate">MFA Status</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    user.mfa_enabled 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {user.mfa_enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-slate">SSO Status</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    user.sso_connected 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {user.sso_connected ? 'Connected' : 'Not Connected'}
                  </span>
                </div>
                <div className="text-xs text-gray-slate">
                  Last login: {formatDate(user.last_login || '')}
                </div>
                <Button variant="outline" size="sm" className="w-full">
                  Manage Security
                </Button>
              </div>
            </Card>

            {/* Billing Card */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-orange-dark mb-4">
                Billing
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-slate">Plan</span>
                  <span className="text-sm font-medium">Pro</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-slate">Seats Used</span>
                  <span className="text-sm font-medium">6 / 10</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-slate">Next Invoice</span>
                  <span className="text-sm font-medium">Nov 1, 2025</span>
                </div>
                <Button variant="outline" size="sm" className="w-full">
                  Manage Billing
                </Button>
              </div>
            </Card>
          </div>

          {/* Main Content */}
          <div className="flex-1 space-y-6">
            {/* Organization Membership */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-orange-dark">
                  Organization Membership
                </h3>
                <Button variant="outline" size="sm">
                  Manage Organizations
                </Button>
              </div>
              <div className="grid gap-4">
                {user.organizations?.map((org) => (
                  <div key={org.id} className="border border-gray-light rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-orange-dark">{org.name}</h4>
                      <span className={`text-xs px-2 py-1 rounded-full border ${getRoleBadgeColor(org.role)}`}>
                        {org.role}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-slate mb-3">
                      <span>{org.projects_count} projects</span>
                      <span>{org.zones_count} zones</span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        Go to Org
                      </Button>
                      {(org.role === 'Admin' || org.role === 'SuperAdmin') && (
                        <Button variant="outline" size="sm">
                          Manage
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* API Keys */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-orange-dark">
                  API Keys
                </h3>
                <Button variant="primary" size="sm">
                  Create API Key
                </Button>
              </div>
              <div className="space-y-3">
                <div className="border border-gray-light rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">CI Integration</h4>
                      <p className="text-sm text-gray-slate">Created Jun 1, 2025</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        Rotate
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-600">
                        Revoke
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="border border-gray-light rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">CLI</h4>
                      <p className="text-sm text-gray-slate">Created Jul 3, 2025</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        Rotate
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-600">
                        Revoke
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Activity Feed */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-orange-dark">
                  Recent Activity
                </h3>
                <Button variant="outline" size="sm">
                  Export Activity
                </Button>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Enabled MFA</p>
                    <p className="text-xs text-gray-slate">Sep 30, 2025 at 12:34 PM</p>
                    <p className="text-xs text-gray-slate">Company Corp</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Created DNS zone example.com</p>
                    <p className="text-xs text-gray-slate">Sep 28, 2025 at 9:01 AM</p>
                    <p className="text-xs text-gray-slate">Company Corp • example.com</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-orange rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Updated DNS record</p>
                    <p className="text-xs text-gray-slate">Sep 25, 2025 at 2:15 PM</p>
                    <p className="text-xs text-gray-slate">Company Corp • api.example.com</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Admin Quick Links */}
            {(user.role === 'superuser' || user.organizations?.some(org => org.role === 'Admin' || org.role === 'SuperAdmin')) && (
              <Card className="p-6">
                <h3 className="text-xl font-semibold text-orange-dark mb-4">
                  Admin Controls
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <Button variant="outline" size="sm">
                    Manage Members
                  </Button>
                  <Button variant="outline" size="sm">
                    Invite Users
                  </Button>
                  {user.role === 'superuser' && (
                    <>
                      <Button variant="outline" size="sm">
                        Set Primary Domain
                      </Button>
                      <Button variant="outline" size="sm">
                        Resolve Conflicts
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
