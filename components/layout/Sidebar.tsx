'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { useHierarchyStore } from '@/lib/hierarchy-store';
import { mockOrganizations, getZonesByEnvironment } from '@/lib/mock-hierarchy-data';
import { AddOrganizationModal } from '@/components/modals/AddOrganizationModal';

export function Sidebar() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { expandedOrgs, expandedEnvironments, toggleOrg, toggleEnvironment, selectAndExpand } = useHierarchyStore();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAddOrgModalOpen, setIsAddOrgModalOpen] = useState(false);

  // Filter organizations based on user's access
  // When logged in with Supabase, show user's organizations
  // When using mock auth (or not logged in), show all mock organizations for development
  const userOrganizations = user?.organizations && user.organizations.length > 0
    ? mockOrganizations.filter(org => 
        user.organizations?.some(userOrg => userOrg.id === org.id)
      )
    : mockOrganizations; // Fallback to all organizations for development/demo

  const handleOrganizationSuccess = (organizationId: string) => {
    // Auto-expand and select the new organization
    selectAndExpand(organizationId);
    // Navigate to the new organization page
    router.push(`/organization/${organizationId}`);
  };

  return (
    <aside
      className={`bg-white dark:bg-orange-dark border-r border-gray-light transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-64'
      } h-screen overflow-hidden sticky top-0 flex flex-col`}
    >
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-light flex items-center justify-between">
        {!isCollapsed && (
          <h2 className="font-bold text-orange-dark dark:text-white">Organizations</h2>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 hover:bg-gray-light rounded-md transition-colors"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg
            className="w-5 h-5 text-gray-slate"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={isCollapsed ? 'M9 5l7 7-7 7' : 'M15 19l-7-7 7-7'}
            />
          </svg>
        </button>
      </div>

      {/* Add Organization Button */}
      {!isCollapsed && (
        <div className="flex-shrink-0 p-4 border-b border-gray-light">
          <button
            onClick={() => setIsAddOrgModalOpen(true)}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-orange hover:bg-orange-dark text-white rounded-md transition-colors"
            title="Add Organization"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span className="text-sm">Add Organization</span>
          </button>
        </div>
      )}

      {/* Tree View */}
      <nav className="flex-1 overflow-y-auto p-4 pb-8 min-h-0" style={{ maxHeight: 'calc(100vh - 180px)' }}>
        {isCollapsed ? (
          // Collapsed view - show icons only
          <div className="flex flex-col space-y-2">
            {userOrganizations.map((org) => (
              <Link
                key={org.id}
                href={`/organization/${org.id}`}
                className="p-2 hover:bg-gray-light rounded-md transition-colors flex items-center justify-center"
                title={org.name}
              >
                <svg
                  className="w-5 h-5 text-gray-slate"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                  />
                </svg>
              </Link>
            ))}
          </div>
        ) : (
          // Expanded view - show full tree
          <div className="space-y-1">
            {userOrganizations.map((org) => (
              <div key={org.id}>
                {/* Organization */}
                <div className="flex items-center group">
                  <button
                    onClick={() => toggleOrg(org.id)}
                    className="p-1 hover:bg-gray-light rounded transition-colors"
                    aria-label={expandedOrgs.has(org.id) ? 'Collapse' : 'Expand'}
                  >
                    <svg
                      className={`w-4 h-4 text-gray-slate transition-transform ${
                        expandedOrgs.has(org.id) ? 'rotate-90' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                  <Link
                    href={`/organization/${org.id}`}
                    className="flex items-center space-x-2 px-2 py-1 hover:bg-gray-light rounded flex-1 transition-colors group-hover:text-orange"
                  >
                    <svg
                      className="w-4 h-4 text-orange"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                      />
                    </svg>
                    <span className="text-sm font-medium text-orange-dark dark:text-white">
                      {org.name}
                    </span>
                  </Link>
                </div>

                {/* Environments */}
                {expandedOrgs.has(org.id) && (
                  <div className="ml-4 mt-1 space-y-1">
                    {org.environments.map((environment) => (
                      <div key={environment.id}>
                        <div className="flex items-center group">
                          <button
                            onClick={() => toggleEnvironment(environment.id)}
                            className="p-1 hover:bg-gray-light rounded transition-colors"
                            aria-label={expandedEnvironments.has(environment.id) ? 'Collapse' : 'Expand'}
                          >
                            <svg
                              className={`w-4 h-4 text-gray-slate transition-transform ${
                                expandedEnvironments.has(environment.id) ? 'rotate-90' : ''
                              }`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </button>
                          <Link
                            href={`/organization/${org.id}/environment/${environment.id}`}
                            className="flex items-center space-x-2 px-2 py-1 hover:bg-gray-light rounded flex-1 transition-colors group-hover:text-orange"
                          >
                            <svg
                              className="w-4 h-4 text-blue-electric"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
                              />
                            </svg>
                            <span className="text-sm text-gray-slate">{environment.name}</span>
                          </Link>
                        </div>

                        {/* Zones */}
                        {expandedEnvironments.has(environment.id) && (
                          <div className="ml-4 mt-1 space-y-1">
                            {getZonesByEnvironment(environment.id).map((zone) => (
                              <Link
                                key={zone.id}
                                href={`/zone/${zone.id}`}
                                className="flex items-center space-x-2 px-2 py-1 hover:bg-gray-light rounded transition-colors group"
                              >
                                <svg
                                  className="w-4 h-4 text-gray-slate group-hover:text-orange"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                                <span className="text-sm text-gray-slate group-hover:text-orange">
                                  {zone.name}
                                </span>
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </nav>

      {/* Add Organization Modal */}
      <AddOrganizationModal
        isOpen={isAddOrgModalOpen}
        onClose={() => setIsAddOrgModalOpen(false)}
        onSuccess={handleOrganizationSuccess}
      />
    </aside>
  );
}
