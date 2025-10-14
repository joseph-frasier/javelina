'use client';

import { useAuthStore } from '@/lib/auth-store';
import { useSettingsStore } from '@/lib/settings-store';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Dropdown from '@/components/ui/Dropdown';
import { useState } from 'react';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const { 
    general, 
    security, 
    access, 
    integrations, 
    auditLogs,
    updateGeneralSettings,
    updateSecuritySettings,
    updateAccessSettings,
    updateIntegrationSettings
  } = useSettingsStore();
  
  const [activeSection, setActiveSection] = useState('general');

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

  const getRolePermissions = () => {
    if (user.role === 'superuser') {
      return { canEdit: true, canManageUsers: true, canViewAudit: true };
    }
    
    const orgRole = user.organizations?.[0]?.role;
    switch (orgRole) {
      case 'Admin':
        return { canEdit: true, canManageUsers: true, canViewAudit: true };
      case 'Editor':
        return { canEdit: true, canManageUsers: false, canViewAudit: true };
      case 'Viewer':
        return { canEdit: true, canManageUsers: false, canViewAudit: true };
      default:
        return { canEdit: true, canManageUsers: false, canViewAudit: true };
    }
  };

  const permissions = getRolePermissions();

  const sections = [
    { id: 'general', name: 'General Settings', icon: '⚙️' },
    { id: 'security', name: 'Security Settings', icon: '🔒' },
    ...(user.role === 'superuser' ? [{ id: 'access', name: 'Access Management', icon: '👥' }] : []),
    { id: 'integrations', name: 'Integrations', icon: '🔗' },
    { id: 'audit', name: 'Audit & Compliance', icon: '📋' }
  ];

  return (
    <ProtectedRoute>
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-orange-dark mb-8">Settings</h1>
          
          <div className="flex gap-8">
            {/* Sidebar Navigation */}
            <div className="w-64 flex-shrink-0">
              <nav className="space-y-2">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                      activeSection === section.id
                        ? 'bg-orange text-white'
                        : 'text-gray-slate hover:bg-gray-light'
                    }`}
                  >
                    <span className="mr-3">{section.icon}</span>
                    {section.name}
                  </button>
                ))}
              </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1">
              {/* General Settings */}
              {activeSection === 'general' && (
                <Card className="p-6">
                  <h2 className="text-2xl font-semibold text-orange-dark mb-6">General Settings</h2>
                  
                  <div className="space-y-6">
                    {/* Theme Selection */}
                    <div>
                      <label className="block text-sm font-medium text-orange-dark mb-2">Theme</label>
                      <div className="flex gap-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="theme"
                            value="light"
                            checked={general.theme === 'light'}
                            onChange={(e) => updateGeneralSettings({ theme: e.target.value as 'light' | 'dark' | 'system' })}
                            className="mr-2"
                          />
                          Light
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="theme"
                            value="dark"
                            checked={general.theme === 'dark'}
                            onChange={(e) => updateGeneralSettings({ theme: e.target.value as 'light' | 'dark' | 'system' })}
                            className="mr-2"
                          />
                          Dark
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="theme"
                            value="system"
                            checked={general.theme === 'system'}
                            onChange={(e) => updateGeneralSettings({ theme: e.target.value as 'light' | 'dark' | 'system' })}
                            className="mr-2"
                          />
                          System
                        </label>
                      </div>
                    </div>

                    {/* Language */}
                    <div>
                      <Dropdown
                        label="Language"
                        value={general.language}
                        options={[
                          { value: 'English', label: 'English' },
                          { value: 'Spanish', label: 'Spanish' },
                          { value: 'French', label: 'French' }
                        ]}
                        onChange={(value) => updateGeneralSettings({ language: value })}
                        className="w-48"
                      />
                    </div>

                    {/* Timezone */}
                    <div>
                      <Dropdown
                        label="Timezone"
                        value={general.timezone}
                        options={[
                          { value: 'America/New_York', label: 'Eastern Time' },
                          { value: 'America/Chicago', label: 'Central Time' },
                          { value: 'America/Denver', label: 'Mountain Time' },
                          { value: 'America/Los_Angeles', label: 'Pacific Time' },
                          { value: 'UTC', label: 'UTC' }
                        ]}
                        onChange={(value) => updateGeneralSettings({ timezone: value })}
                        className="w-48"
                      />
                    </div>

                    {/* Notifications */}
                    <div>
                      <h3 className="text-lg font-medium text-orange-dark mb-4">Notification Preferences</h3>
                      <div className="space-y-3">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={general.notifications.email.dns_updates}
                            onChange={(e) => updateGeneralSettings({
                              notifications: {
                                ...general.notifications,
                                email: {
                                  ...general.notifications.email,
                                  dns_updates: e.target.checked
                                }
                              }
                            })}
                            className="mr-3"
                          />
                          Email alerts for DNS record updates
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={general.notifications.email.project_changes}
                            onChange={(e) => updateGeneralSettings({
                              notifications: {
                                ...general.notifications,
                                email: {
                                  ...general.notifications.email,
                                  project_changes: e.target.checked
                                }
                              }
                            })}
                            className="mr-3"
                          />
                          Email alerts for environment changes
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={general.notifications.email.system_alerts}
                            onChange={(e) => updateGeneralSettings({
                              notifications: {
                                ...general.notifications,
                                email: {
                                  ...general.notifications.email,
                                  system_alerts: e.target.checked
                                }
                              }
                            })}
                            className="mr-3"
                          />
                          Email alerts for system messages
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={general.notifications.browser_push}
                            onChange={(e) => updateGeneralSettings({
                              notifications: {
                                ...general.notifications,
                                browser_push: e.target.checked
                              }
                            })}
                            className="mr-3"
                          />
                          Browser push notifications
                        </label>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Security Settings */}
              {activeSection === 'security' && permissions.canEdit && (
                <Card className="p-6">
                  <h2 className="text-2xl font-semibold text-orange-dark mb-6">Security Settings</h2>
                  
                  <div className="space-y-6">
                    {/* MFA */}
                    <div>
                      <h3 className="text-lg font-medium text-orange-dark mb-4">Multi-Factor Authentication</h3>
                      <div className="flex items-center justify-between p-4 border border-gray-light rounded-lg">
                        <div>
                          <p className="font-medium">MFA Status</p>
                          <p className="text-sm text-gray-slate">
                            {security.mfa.enabled ? 'Enabled' : 'Disabled'} • {security.mfa.method}
                          </p>
                          <p className="text-xs text-gray-slate">
                            Last verified: {formatDate(security.mfa.last_verified)}
                          </p>
                        </div>
                        <Button
                          variant={security.mfa.enabled ? 'outline' : 'primary'}
                          size="sm"
                          onClick={() => updateSecuritySettings({
                            mfa: {
                              ...security.mfa,
                              enabled: !security.mfa.enabled
                            }
                          })}
                        >
                          {security.mfa.enabled ? 'Disable' : 'Enable'} MFA
                        </Button>
                      </div>
                    </div>

                    {/* SSO */}
                    <div>
                      <h3 className="text-lg font-medium text-orange-dark mb-4">Single Sign-On</h3>
                      <div className="flex items-center justify-between p-4 border border-gray-light rounded-lg">
                        <div>
                          <p className="font-medium">SSO Status</p>
                          <p className="text-sm text-gray-slate">
                            {security.sso.provider} • {security.sso.status}
                          </p>
                          <p className="text-xs text-gray-slate">
                            Last sync: {formatDate(security.sso.last_sync)}
                          </p>
                        </div>
                        <Button variant="outline" size="sm">
                          {security.sso.status === 'connected' ? 'Disconnect' : 'Connect'} SSO
                        </Button>
                      </div>
                    </div>

                    {/* IP Allowlist */}
                    <div>
                      <h3 className="text-lg font-medium text-orange-dark mb-4">IP Allowlist</h3>
                      <div className="space-y-2">
                        {security.ip_allowlist.map((ip, index) => (
                          <div key={index} className="flex items-center justify-between p-3 border border-gray-light rounded">
                            <span className="font-mono text-sm">{ip}</span>
                            <Button variant="outline" size="sm" className="text-red-600">
                              Remove
                            </Button>
                          </div>
                        ))}
                        <Button variant="outline" size="sm">
                          Add IP Range
                        </Button>
                      </div>
                    </div>

                    {/* Active Sessions */}
                    <div>
                      <h3 className="text-lg font-medium text-orange-dark mb-4">Active Sessions</h3>
                      <div className="space-y-3">
                        {security.sessions.map((session, index) => (
                          <div key={index} className="flex items-center justify-between p-4 border border-gray-light rounded-lg">
                            <div>
                              <p className="font-medium">{session.device}</p>
                              <p className="text-sm text-gray-slate">{session.location}</p>
                              <p className="text-xs text-gray-slate">Last login: {formatDate(session.last_login)}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                session.status === 'active' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {session.status}
                              </span>
                              <Button variant="outline" size="sm" className="text-red-600">
                                Revoke
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Access Management */}
              {activeSection === 'access' && permissions.canManageUsers && (
                <Card className="p-6">
                  <h2 className="text-2xl font-semibold text-orange-dark mb-6">Access Management</h2>
                  
                  <div className="space-y-6">
                    {/* Organization Members */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-orange-dark">Organization Members</h3>
                        <Button variant="primary" size="sm">
                          Invite User
                        </Button>
                      </div>
                      <div className="space-y-3">
                        {access.members.map((member, index) => (
                          <div key={index} className="flex items-center justify-between p-4 border border-gray-light rounded-lg">
                            <div>
                              <p className="font-medium">{member.name}</p>
                              <p className="text-sm text-gray-slate">{member.email}</p>
                              <p className="text-xs text-gray-slate">Last active: {formatDate(member.last_active)}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-800">
                                {member.role}
                              </span>
                              <Button variant="outline" size="sm">
                                Edit Role
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Environment Overrides */}
                    <div>
                      <h3 className="text-lg font-medium text-orange-dark mb-4">Environment-Level Overrides</h3>
                      <div className="space-y-3">
                        {Object.entries(access.environment_overrides).map(([environment, override]) => (
                          <div key={environment} className="flex items-center justify-between p-4 border border-gray-light rounded-lg">
                            <div>
                              <p className="font-medium capitalize">{environment}</p>
                              <p className="text-sm text-gray-slate">Role override</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-800">
                                {override.role}
                              </span>
                              <Button variant="outline" size="sm">
                                Edit
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Integrations */}
              {activeSection === 'integrations' && permissions.canEdit && (
                <Card className="p-6">
                  <h2 className="text-2xl font-semibold text-orange-dark mb-6">Integration Settings</h2>
                  
                  <div className="space-y-6">
                    {/* Slack */}
                    <div className="flex items-center justify-between p-4 border border-gray-light rounded-lg">
                      <div>
                        <h3 className="font-medium">Slack Integration</h3>
                        <p className="text-sm text-gray-slate">
                          {integrations.slack.status === 'connected' 
                            ? `Connected to ${integrations.slack.workspace}` 
                            : 'Not connected'
                          }
                        </p>
                        {integrations.slack.connected_on && (
                          <p className="text-xs text-gray-slate">
                            Connected: {formatDate(integrations.slack.connected_on)}
                          </p>
                        )}
                      </div>
                      <Button 
                        variant={integrations.slack.status === 'connected' ? 'outline' : 'primary'} 
                        size="sm"
                      >
                        {integrations.slack.status === 'connected' ? 'Disconnect' : 'Connect'}
                      </Button>
                    </div>

                    {/* Microsoft Teams */}
                    <div className="flex items-center justify-between p-4 border border-gray-light rounded-lg">
                      <div>
                        <h3 className="font-medium">Microsoft Teams</h3>
                        <p className="text-sm text-gray-slate">
                          {integrations.microsoft_teams.status === 'connected' 
                            ? `Connected to ${integrations.microsoft_teams.channel}` 
                            : 'Not connected'
                          }
                        </p>
                      </div>
                      <Button 
                        variant={integrations.microsoft_teams.status === 'connected' ? 'outline' : 'primary'} 
                        size="sm"
                      >
                        {integrations.microsoft_teams.status === 'connected' ? 'Disconnect' : 'Connect'}
                      </Button>
                    </div>

                    {/* PagerDuty */}
                    <div className="flex items-center justify-between p-4 border border-gray-light rounded-lg">
                      <div>
                        <h3 className="font-medium">PagerDuty Integration</h3>
                        <p className="text-sm text-gray-slate">
                          {integrations.pagerduty.status === 'connected' 
                            ? `Connected to ${integrations.pagerduty.service_name}` 
                            : 'Not connected'
                          }
                        </p>
                      </div>
                      <Button 
                        variant={integrations.pagerduty.status === 'connected' ? 'outline' : 'primary'} 
                        size="sm"
                      >
                        {integrations.pagerduty.status === 'connected' ? 'Disconnect' : 'Connect'}
                      </Button>
                    </div>
                  </div>
                </Card>
              )}

              {/* Audit & Compliance */}
              {activeSection === 'audit' && permissions.canViewAudit && (
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-semibold text-orange-dark">Audit & Compliance</h2>
                    <Button variant="outline" size="sm">
                      Export Logs
                    </Button>
                  </div>
                  
                  <div className="space-y-4">
                    {auditLogs.map((log, index) => (
                      <div key={index} className="flex items-start gap-4 p-4 border border-gray-light rounded-lg">
                        <div className="w-2 h-2 bg-orange rounded-full mt-2"></div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium">{log.action}</p>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              log.category === 'Security' 
                                ? 'bg-red-100 text-red-800'
                                : log.category === 'Access'
                                ? 'bg-blue-100 text-blue-800'
                                : log.category === 'Integrations'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-orange-100 text-orange-800'
                            }`}>
                              {log.category}
                            </span>
                          </div>
                          <p className="text-sm text-gray-slate">{log.user}</p>
                          <p className="text-xs text-gray-slate">{formatDate(log.timestamp)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
