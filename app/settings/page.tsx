'use client';

import { useAuthStore } from '@/lib/auth-store';
import { useSettingsStore } from '@/lib/settings-store';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Dropdown from '@/components/ui/Dropdown';
import { ExportButton } from '@/components/admin/ExportButton';
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
    { 
      id: 'general', 
      name: 'General Settings', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    },
    { 
      id: 'security', 
      name: 'Security Settings', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      )
    },
    ...(user.role === 'superuser' ? [{ 
      id: 'access', 
      name: 'Access Management', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )
    }] : []),
    { 
      id: 'integrations', 
      name: 'Integrations', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      )
    },
    { 
      id: 'audit', 
      name: 'Audit & Compliance', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      )
    },
    { 
      id: 'password', 
      name: 'Password & Authentication', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      )
    }
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
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center whitespace-nowrap ${
                      activeSection === section.id
                        ? 'bg-orange text-white'
                        : 'text-gray-slate hover:bg-gray-light/30'
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

                    {/* Two Column Layout for Compact Settings */}
                    <div className="grid grid-cols-2 gap-6">
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
                        />
                      </div>

                      {/* Date Format */}
                      <div>
                        <Dropdown
                          label="Date Format"
                          value={general.dateFormat || 'MM/DD/YYYY'}
                          options={[
                            { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
                            { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
                            { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' }
                          ]}
                          onChange={(value) => updateGeneralSettings({ dateFormat: value as 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD' })}
                        />
                      </div>

                      {/* Time Format */}
                      <div>
                        <Dropdown
                          label="Time Format"
                          value={general.timeFormat || '12h'}
                          options={[
                            { value: '12h', label: '12-hour (2:30 PM)' },
                            { value: '24h', label: '24-hour (14:30)' }
                          ]}
                          onChange={(value) => updateGeneralSettings({ timeFormat: value as '12h' | '24h' })}
                        />
                      </div>

                      {/* Default Landing Page */}
                      <div>
                        <Dropdown
                          label="Default Landing Page"
                          value={general.defaultLandingPage || 'dashboard'}
                          options={[
                            { value: 'dashboard', label: 'Dashboard' },
                            { value: 'organizations', label: 'Organizations' },
                            { value: 'analytics', label: 'Analytics' },
                            { value: 'settings', label: 'Settings' }
                          ]}
                          onChange={(value) => updateGeneralSettings({ defaultLandingPage: value })}
                        />
                      </div>

                      {/* Items Per Page */}
                      <div>
                        <Dropdown
                          label="Items Per Page"
                          value={(general.itemsPerPage || 25).toString()}
                          options={[
                            { value: '10', label: '10 items' },
                            { value: '25', label: '25 items' },
                            { value: '50', label: '50 items' },
                            { value: '100', label: '100 items' }
                          ]}
                          onChange={(value) => updateGeneralSettings({ itemsPerPage: parseInt(value) })}
                        />
                      </div>

                      {/* Auto-Refresh Interval */}
                      <div>
                        <Dropdown
                          label="Auto-Refresh Interval"
                          value={(general.autoRefreshInterval ?? 60).toString()}
                          options={[
                            { value: '0', label: 'Off' },
                            { value: '30', label: '30 seconds' },
                            { value: '60', label: '1 minute' },
                            { value: '300', label: '5 minutes' },
                            { value: '600', label: '10 minutes' }
                          ]}
                          onChange={(value) => updateGeneralSettings({ autoRefreshInterval: parseInt(value) })}
                        />
                      </div>

                      {/* Default DNS TTL */}
                      <div>
                        <Dropdown
                          label="Default DNS Record TTL"
                          value={(general.defaultDnsTtl || 3600).toString()}
                          options={[
                            { value: '300', label: '5 minutes' },
                            { value: '1800', label: '30 minutes' },
                            { value: '3600', label: '1 hour' },
                            { value: '14400', label: '4 hours' },
                            { value: '86400', label: '24 hours' }
                          ]}
                          onChange={(value) => updateGeneralSettings({ defaultDnsTtl: parseInt(value) })}
                        />
                      </div>
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
                  <div className="flex items-center justify-end mb-6">
                    <ExportButton 
                      data={auditLogs} 
                      filename="audit-logs"
                      label="Export Logs"
                    />
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

              {/* Password & Authentication */}
              {activeSection === 'password' && (
                <Card className="p-6">
                  <h2 className="text-xl font-semibold text-orange-dark dark:text-orange mb-6">Sign in methods</h2>
                  <div className="space-y-3">
                    {/* Email */}
                    <div className="flex items-center justify-between p-4 border border-gray-light dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 flex items-center justify-center">
                          <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">Email</p>
                          <p className="text-sm text-gray-slate dark:text-gray-400">1 verified email configured</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        Manage
                      </Button>
                    </div>

                    {/* Password */}
                    <div className="flex items-center justify-between p-4 border border-gray-light dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 flex items-center justify-center">
                          <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">Password</p>
                          <p className="text-sm text-gray-slate dark:text-gray-400">Configured</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        Change password
                      </Button>
                    </div>

                    {/* Google */}
                    <div className="flex items-center justify-between p-4 border border-gray-light dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 flex items-center justify-center">
                          <svg className="w-6 h-6" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">Google</p>
                          <p className="text-sm text-gray-slate dark:text-gray-400">Sign in with your Google account</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        Connect
                      </Button>
                    </div>

                    {/* GitHub */}
                    <div className="flex items-center justify-between p-4 border border-gray-light dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 flex items-center justify-center">
                          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">GitHub</p>
                          <p className="text-sm text-gray-slate dark:text-gray-400">Sign in with your GitHub account</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        Connect
                      </Button>
                    </div>
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
