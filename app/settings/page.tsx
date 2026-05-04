'use client';

import { useAuthStore } from '@/lib/auth-store';
import { useSettingsStore } from '@/lib/settings-store';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { SettingsLayout } from '@/components/layout/SettingsLayout';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { ExportButton } from '@/components/admin/ExportButton';
import { ChangePasswordModal } from '@/components/modals/ChangePasswordModal';
import { ManageEmailModal } from '@/components/modals/ManageEmailModal';
import { LegalSettings } from '@/components/legal/LegalSettings';
import { subscriptionsApi } from '@/lib/api-client';
import { useToastStore } from '@/lib/toast-store';
import { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const { 
    general, 
    access, 
    auditLogs,
    updateGeneralSettings,
    updateAccessSettings
  } = useSettingsStore();
  
  const [activeSection, setActiveSection] = useState('general');
  
  // Billing pagination state
  const [billingCurrentPage, setBillingCurrentPage] = useState(1);
  const billingItemsPerPage = 10;
  const billingSectionRef = useRef<HTMLDivElement>(null);
  
  // Read section from URL query parameter
  useEffect(() => {
    const section = searchParams.get('section');
    if (section) {
      setActiveSection(section);
    }
  }, [searchParams]);
  
  // Modal states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  
  // OAuth connection states
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [isGithubConnected, setIsGithubConnected] = useState(false);
  const [isLoadingOAuth, setIsLoadingOAuth] = useState(false);
  
  // Billing states
  const [billingOrgs, setBillingOrgs] = useState<Array<{
    id: string;
    name: string;
    current_plan: string;
    plan_status: string;
    next_billing_date: string | null;
    stripe_customer_id: string | null;
  }>>([]);
  const [billingLoading, setBillingLoading] = useState(false);

  // Fetch OAuth connection status on mount
  useEffect(() => {
    checkOAuthConnections();
  }, []);

  const checkOAuthConnections = async () => {
    // TODO: Auth0 OAuth connections check
    // For now, disable OAuth connection UI for Auth0 users
    // This feature needs backend endpoint: GET /api/auth/connections
    try {
      // Placeholder - Auth0 users don't have Supabase identities
      setIsGoogleConnected(false);
      setIsGithubConnected(false);
    } catch (error) {
      console.error('Error checking OAuth connections:', error);
    }
  };

  const handleOAuthConnect = async (provider: 'google' | 'github') => {
    // TODO: Implement via Auth0 account linking API through Express backend
    addToast('error', 'OAuth account linking is not yet available. This feature requires Auth0 implementation.');
  };

  const handleOAuthDisconnect = async (provider: 'google' | 'github') => {
    // TODO: Implement via Auth0 account linking API through Express backend
    try {
      addToast('error', 'OAuth account unlinking is not yet available. This feature requires Auth0 implementation.');
    } catch (error: any) {
      console.error('OAuth disconnection error:', error);
      addToast('error', error.message || `Failed to disconnect ${provider}`);
    } finally {
      setIsLoadingOAuth(false);
    }
  };

  const handleConnectedOAuthClick = (provider: 'google' | 'github') => {
    const providerName = provider === 'google' ? 'Google' : 'GitHub';
    const providerUrl = provider === 'google' 
      ? 'https://myaccount.google.com/permissions' 
      : 'https://github.com/settings/applications';
    
    addToast(
      'info', 
      `To disconnect your ${providerName} account, please manage your connected applications at ${providerUrl}`
    );
  };

  const fetchBillingOrganizations = useCallback(async () => {
    setBillingLoading(true);
    try {
      const data = await subscriptionsApi.getAllWithSubscriptions();
      
      // Transform the API response to match the expected format
      const orgs = Array.isArray(data) ? data.map((item: any) => ({
        id: item.org_id,
        name: item.organization_name,
        current_plan: item.plan_name || 'Free',
        plan_status: item.status || 'active',
        next_billing_date: item.current_period_end || null,
        stripe_customer_id: item.stripe_customer_id,
      })) : [];

      setBillingOrgs(orgs);
    } catch (error) {
      console.error('Error fetching billing organizations:', error);
      addToast('error', 'Failed to load billing information');
      setBillingOrgs([]);
    } finally {
      setBillingLoading(false);
    }
  }, [addToast]);

  // Fetch billing data when billing section is active
  useEffect(() => {
    if (activeSection === 'billing') {
      fetchBillingOrganizations();
    }
  }, [activeSection, fetchBillingOrganizations]);

  // Sort billing orgs by most recent (assuming they have created_at or similar)
  const sortedBillingOrgs = [...billingOrgs].reverse();
  
  // Billing pagination logic
  const billingTotalPages = Math.ceil(sortedBillingOrgs.length / billingItemsPerPage);
  const billingStartIndex = (billingCurrentPage - 1) * billingItemsPerPage;
  const billingEndIndex = billingStartIndex + billingItemsPerPage;
  const paginatedBillingOrgs = sortedBillingOrgs.slice(billingStartIndex, billingEndIndex);

  // Scroll to top when billing page changes
  useEffect(() => {
    if (billingSectionRef.current) {
      billingSectionRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start'
      });
    }
  }, [billingCurrentPage]);

  const handleBillingPageChange = (page: number) => {
    setBillingCurrentPage(page);
  };

  const handleManageBilling = (orgId: string) => {
    router.push(`/settings/billing/${orgId}`);
  };

  const formatBillingDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getBillingStatusDotColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'canceled':
      case 'past_due':
        return 'bg-red-500';
      case 'trialing':
        return 'bg-blue-electric';
      default:
        return 'bg-gray-slate';
    }
  };

  const handleSectionClick = (sectionId: string, externalLink?: boolean) => {
    setActiveSection(sectionId);
  };

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
      id: 'billing', 
      name: 'Billing & Subscription', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
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
      id: 'audit', 
      name: 'Audit & Compliance', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      )
    },
    // TODO: Re-enable when Auth0 password reset & OAuth connection methods are implemented
    // { 
    //   id: 'password', 
    //   name: 'Password & Authentication', 
    //   icon: (
    //     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    //       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    //     </svg>
    //   )
    // }
  ];

  return (
    <ProtectedRoute>
      <div className="p-4 sm:p-6 md:p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-text mb-4 sm:mb-6 md:mb-8">Settings</h1>
          
          {/* Mobile: Horizontal Scrolling Tabs */}
          <div className="md:hidden mb-6 -mx-4 px-4 overflow-x-auto">
            <nav className="flex gap-2 min-w-max pb-2">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap text-sm ${
                    activeSection === section.id
                      ? 'bg-accent text-white'
                      : 'text-text-muted bg-surface hover:bg-surface-hover'
                  }`}
                >
                  <span>{section.icon}</span>
                  <span>{section.name}</span>
                </button>
              ))}
            </nav>
          </div>
          
          <div className="flex flex-col md:flex-row gap-6 md:gap-8">
            {/* Desktop: Sidebar Navigation */}
            <div className="hidden md:block w-64 flex-shrink-0">
              <nav className="space-y-2 sticky top-6">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => handleSectionClick(section.id, (section as any).externalLink)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center whitespace-nowrap ${
                      activeSection === section.id
                        ? 'bg-accent text-white'
                        : 'text-text-muted hover:bg-surface-hover dark:hover:bg-gray-800'
                    }`}
                  >
                    <span className="mr-3">{section.icon}</span>
                    {section.name}
                    {(section as any).externalLink && (
                      <svg className="w-4 h-4 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1 min-w-0">
              {/* General Settings */}
              {activeSection === 'general' && (
                <Card className="p-4 sm:p-6">
                  <div className="space-y-6">
                    {/* Theme Selection */}
                    <div>
                      <label className="block text-sm font-medium text-text mb-2">Theme</label>
                      <div className="flex flex-wrap gap-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="theme"
                            value="light"
                            checked={general.theme === 'light'}
                            onChange={(e) => updateGeneralSettings({ theme: e.target.value as 'light' | 'dark' })}
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
                            onChange={(e) => updateGeneralSettings({ theme: e.target.value as 'light' | 'dark' })}
                            className="mr-2"
                          />
                          Dark
                        </label>
                      </div>
                    </div>

                    {/* More Settings Coming Soon */}
                    <div className="pt-6">
                      <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        <p className="text-sm">More settings coming soon</p>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Security Settings */}
              {activeSection === 'security' && permissions.canEdit && (
                <Card className="p-4 sm:p-6">
                  <div className="flex flex-col items-center justify-center py-12">
                    <svg
                      className="w-16 h-16 text-gray-400 dark:text-gray-600 mb-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                    <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Coming Soon
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-md">
                      Security settings and features are currently in development
                    </p>
                  </div>
                </Card>
              )}

              {/* Access Management */}
              {activeSection === 'access' && permissions.canManageUsers && (
                <Card className="p-4 sm:p-6">
                  <div className="space-y-6">
                    {/* Organization Members */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-text">Organization Members</h3>
                        <Button variant="primary" size="sm">
                          Invite User
                        </Button>
                      </div>
                      <div className="space-y-3">
                        {access.members.length === 0 ? (
                          <div className="py-8 flex items-center justify-center border border-border rounded-lg">
                            <div className="text-center">
                              <svg
                                className="mx-auto h-10 w-10 text-gray-400 dark:text-gray-600 mb-2"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                                />
                              </svg>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                No members yet
                              </p>
                            </div>
                          </div>
                        ) : (
                          access.members.map((member, index) => (
                            <div key={index} className="flex items-center justify-between p-4 border border-border rounded-lg">
                              <div>
                                <p className="font-medium">{member.name}</p>
                                <p className="text-sm text-text-muted">{member.email}</p>
                                <p className="text-xs text-text-muted">Last active: {formatDate(member.last_active)}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs px-2 py-1 rounded-full bg-accent-100 text-accent-800">
                                  {member.role}
                                </span>
                                <Button variant="outline" size="sm">
                                  Edit Role
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Environment Overrides */}
                    <div>
                      <h3 className="text-lg font-medium text-text mb-4">Environment-Level Overrides</h3>
                      <div className="space-y-3">
                        {Object.keys(access.environment_overrides).length === 0 ? (
                          <div className="py-8 flex items-center justify-center border border-border rounded-lg">
                            <div className="text-center">
                              <svg
                                className="mx-auto h-10 w-10 text-gray-400 dark:text-gray-600 mb-2"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                                />
                              </svg>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                No environment overrides configured
                              </p>
                            </div>
                          </div>
                        ) : (
                          Object.entries(access.environment_overrides).map(([environment, override]) => (
                            <div key={environment} className="flex items-center justify-between p-4 border border-border rounded-lg">
                              <div>
                                <p className="font-medium capitalize">{environment}</p>
                                <p className="text-sm text-text-muted">Role override</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs px-2 py-1 rounded-full bg-accent-100 text-accent-800">
                                  {override.role}
                                </span>
                                <Button variant="outline" size="sm">
                                  Edit
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Audit & Compliance */}
              {activeSection === 'audit' && permissions.canViewAudit && (
                <Card className="p-4 sm:p-6">
                  {auditLogs.length > 0 && (
                    <div className="flex items-center justify-end mb-6">
                      <ExportButton 
                        data={auditLogs} 
                        filename="audit-logs"
                        label="Export Logs"
                      />
                    </div>
                  )}
                  
                  {auditLogs.length === 0 ? (
                    <div className="py-12 flex items-center justify-center">
                      <div className="text-center">
                        <svg
                          className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600 mb-2"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                          />
                        </svg>
                        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          No audit logs yet
                        </h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          Settings changes will appear here
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {auditLogs.map((log, index) => (
                        <div key={index} className="flex items-start gap-4 p-4 border border-border rounded-lg">
                          <div className="w-2 h-2 bg-accent rounded-full mt-2"></div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium">{log.action}</p>
                              <span className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full font-medium border bg-white dark:bg-gray-700 border-border-strong dark:border-gray-600 text-text">
                                <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                  log.category === 'Security' ? 'bg-red-500'
                                  : log.category === 'Access' ? 'bg-blue-electric'
                                  : log.category === 'Integrations' ? 'bg-green-500'
                                  : 'bg-accent'
                                }`} />
                                {log.category}
                              </span>
                            </div>
                            <p className="text-sm text-text-muted">{log.user}</p>
                            <p className="text-xs text-text-muted">{formatDate(log.timestamp)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              )}

              {/* Billing & Subscription */}
              {activeSection === 'billing' && (
                <div ref={billingSectionRef} className="space-y-6">

                {/* Organization Subscriptions */}
                <Card className="p-4 sm:p-6">
                  <div className="mb-6">
                    <h2 className="text-xl sm:text-2xl font-semibold text-text mb-2">
                      Billing & Subscription
                    </h2>
                    <p className="text-sm text-text-muted">
                      Manage billing for your organizations
                    </p>
                  </div>

                  {billingLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
                    </div>
                  ) : billingOrgs.length === 0 ? (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-6 text-center">
                      <svg
                        className="w-12 h-12 text-yellow-600 dark:text-yellow-500 mx-auto mb-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <h3 className="text-lg font-bold text-yellow-800 dark:text-yellow-400 mb-2">
                        No Organizations Available
                      </h3>
                      <p className="text-sm text-yellow-700 dark:text-yellow-500">
                        You don&apos;t have admin access to any organizations. Only admins can manage billing.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {paginatedBillingOrgs.map((org) => (
                        <div
                          key={org.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 border border-border rounded-lg hover:border-accent/50 dark:hover:border-accent/50 transition-colors gap-4"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                              <h3 className="text-base sm:text-lg font-bold text-text">
                                {org.name}
                              </h3>
                              <span className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full font-medium border bg-white dark:bg-gray-700 border-border-strong dark:border-gray-600 text-text">
                                <span
                                  aria-hidden="true"
                                  className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getBillingStatusDotColor(org.plan_status)}`}
                                />
                                {org.plan_status}
                              </span>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-sm text-text-muted">
                              <div>
                                <span className="font-medium">Plan:</span>{' '}
                                <span className="text-text font-semibold">
                                  {org.current_plan}
                                </span>
                              </div>
                              {org.next_billing_date && (
                                <div>
                                  <span className="font-medium">Next Billing:</span>{' '}
                                  {formatBillingDate(org.next_billing_date)}
                                </div>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="primary"
                            size="md"
                            onClick={() => handleManageBilling(org.id)}
                            className="w-full sm:w-auto"
                          >
                            Manage Billing
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Pagination Controls */}
                  {!billingLoading && billingTotalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-6">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBillingPageChange(billingCurrentPage - 1)}
                        disabled={billingCurrentPage === 1}
                        className="disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </Button>
                      
                      <span className="text-sm text-gray-600 dark:text-gray-400 font-medium px-4">
                        Page {billingCurrentPage} of {billingTotalPages}
                      </span>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBillingPageChange(billingCurrentPage + 1)}
                        disabled={billingCurrentPage === billingTotalPages}
                        className="disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </Card>
                </div>
              )}

              {activeSection === 'legal' && (
                <LegalSettings />
              )}

              {/* Password & Authentication - commented out until Auth0 password reset & OAuth are implemented */}
              {/* {activeSection === 'password' && (
                <Card className="p-4 sm:p-6">
                  <h2 className="text-xl font-semibold text-text mb-6">Sign in methods</h2>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-surface">
                      ...
                    </div>
                    ...
                  </div>
                </Card>
              )} */}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ChangePasswordModal 
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
      <ManageEmailModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
      />
    </ProtectedRoute>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    }>
      <SettingsContent />
    </Suspense>
  );
}
