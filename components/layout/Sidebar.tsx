'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useAuthStore } from '@/lib/auth-store';
import { useHierarchyStore } from '@/lib/hierarchy-store';
import { AddOrganizationModal } from '@/components/modals/AddOrganizationModal';
import { useEnvironments } from '@/lib/hooks/useEnvironments';
import { useZones } from '@/lib/hooks/useZones';

interface SidebarProps {
  isMobileMenuOpen?: boolean;
  onMobileMenuClose?: () => void;
}

export function Sidebar({ isMobileMenuOpen = false, onMobileMenuClose }: SidebarProps = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { expandedOrgs, expandedEnvironments, toggleOrg, toggleEnvironment, selectAndExpand } = useHierarchyStore();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAddOrgModalOpen, setIsAddOrgModalOpen] = useState(false);
  
  // Refs for GSAP animations
  const sidebarRef = useRef<HTMLDivElement>(null);
  const envContainerRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const zoneContainerRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  
  // Track previous state to detect newly expanded items
  const prevExpandedOrgs = useRef<Set<string>>(new Set());
  const prevExpandedEnvironments = useRef<Set<string>>(new Set());

  // Get organizations from authenticated user (already from Supabase)
  const userOrganizations = user?.organizations || [];

  // Animate mobile menu
  useEffect(() => {
    if (sidebarRef.current) {
      if (isMobileMenuOpen) {
        gsap.to(sidebarRef.current, {
          x: 0,
          duration: 0.3,
          ease: 'power2.out',
        });
      } else {
        gsap.to(sidebarRef.current, {
          x: -280,
          duration: 0.3,
          ease: 'power2.in',
        });
      }
    }
  }, [isMobileMenuOpen]);

  const handleOrganizationSuccess = (organizationId: string) => {
    // Auto-expand and select the new organization
    selectAndExpand(organizationId);
    // Navigate to the new organization page
    router.push(`/organization/${organizationId}`);
    // Close mobile menu if open
    if (onMobileMenuClose) {
      onMobileMenuClose();
    }
  };

  // Render organizations list (shared between mobile and desktop)
  const renderOrganizations = () => {
    return (
      <div className="space-y-1">
        {userOrganizations.map((org) => (
          <div key={org.id}>
            {/* Organization */}
            <div className="flex items-center group">
              <button
                onClick={() => handleToggleOrg(org.id)}
                className="p-1 rounded transition-colors"
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
                className="flex items-center space-x-2 px-2 py-1 rounded flex-1 transition-colors group-hover:text-orange"
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
              <EnvironmentsList
                orgId={org.id}
                expandedEnvironments={expandedEnvironments}
                handleToggleEnvironment={handleToggleEnvironment}
                envContainerRefs={envContainerRefs}
                zoneContainerRefs={zoneContainerRefs}
              />
            )}
          </div>
        ))}
      </div>
    );
  };

  const handleToggleOrg = (orgId: string) => {
    const isExpanding = !expandedOrgs.has(orgId);
    
    if (isExpanding) {
      // Expanding - toggle immediately
      toggleOrg(orgId);
    } else {
      // Collapsing - animate out first
      const container = envContainerRefs.current[orgId];
      if (container) {
        const environments = container.querySelectorAll('.environment-item');
        
        // Animate environments opacity and position
        gsap.to(environments, {
          opacity: 0,
          x: -20,
          duration: 0.25,
          stagger: 0.02,
          ease: 'power2.in',
        });
        
        // Animate container using scaleY for smooth collapse without reflow
        gsap.to(container, {
          scaleY: 0,
          transformOrigin: 'top',
          marginTop: 0,
          duration: 0.3,
          delay: 0.15,
          ease: 'power2.inOut',
          onComplete: () => {
            toggleOrg(orgId);
            // Reset transform for next expansion
            gsap.set(container, { scaleY: 1, marginTop: '' });
          }
        });
      } else {
        // Fallback if no container
        toggleOrg(orgId);
      }
    }
  };

  const handleToggleEnvironment = (envId: string) => {
    const isExpanding = !expandedEnvironments.has(envId);
    
    if (isExpanding) {
      // Expanding - toggle immediately
      toggleEnvironment(envId);
    } else {
      // Collapsing - animate out first
      const container = zoneContainerRefs.current[envId];
      if (container) {
        const zones = container.querySelectorAll('.zone-item');
        
        // Animate zones opacity and position
        gsap.to(zones, {
          opacity: 0,
          x: -20,
          duration: 0.25,
          stagger: 0.02,
          ease: 'power2.in',
        });
        
        // Animate container using scaleY for smooth collapse without reflow
        gsap.to(container, {
          scaleY: 0,
          transformOrigin: 'top',
          marginTop: 0,
          duration: 0.3,
          delay: 0.15,
          ease: 'power2.inOut',
          onComplete: () => {
            toggleEnvironment(envId);
            // Reset transform for next expansion
            gsap.set(container, { scaleY: 1, marginTop: '' });
          }
        });
      } else {
        // Fallback if no container
        toggleEnvironment(envId);
      }
    }
  };

  // Animate environments when organizations are expanded
  useGSAP(() => {
    // Find newly expanded org (present in current but not in previous)
    const newlyExpandedOrg = Array.from(expandedOrgs).find(
      orgId => !prevExpandedOrgs.current.has(orgId)
    );
    
    if (newlyExpandedOrg) {
      const container = envContainerRefs.current[newlyExpandedOrg];
      if (container) {
        const environments = container.querySelectorAll('.environment-item');
        gsap.fromTo(
          environments,
          {
            opacity: 0,
            x: -20,
          },
          {
            opacity: 1,
            x: 0,
            duration: 0.45,
            stagger: 0.05,
            ease: 'power2.out',
          }
        );
      }
    }
    
    // Update previous state
    prevExpandedOrgs.current = new Set(expandedOrgs);
  }, [expandedOrgs]);

  // Animate zones when environments are expanded
  useGSAP(() => {
    // Find newly expanded environment (present in current but not in previous)
    const newlyExpandedEnv = Array.from(expandedEnvironments).find(
      envId => !prevExpandedEnvironments.current.has(envId)
    );
    
    if (newlyExpandedEnv) {
      const container = zoneContainerRefs.current[newlyExpandedEnv];
      if (container) {
        const zones = container.querySelectorAll('.zone-item');
        gsap.fromTo(
          zones,
          {
            opacity: 0,
            x: -20,
          },
          {
            opacity: 1,
            x: 0,
            duration: 0.45,
            stagger: 0.05,
            ease: 'power2.out',
          }
        );
      }
    }
    
    // Update previous state
    prevExpandedEnvironments.current = new Set(expandedEnvironments);
  }, [expandedEnvironments]);

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onMobileMenuClose}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        ref={sidebarRef}
        className={`fixed top-16 left-0 bottom-0 bg-white dark:bg-orange-dark border-r border-gray-light overflow-hidden flex flex-col z-50 md:hidden w-64 -translate-x-full`}
      >
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-gray-light flex items-center justify-between">
          <h2 className="font-bold text-orange-dark dark:text-white">Navigation</h2>
          <button
            onClick={onMobileMenuClose}
            className="p-2 rounded-md transition-colors hover:bg-gray-light dark:hover:bg-gray-700"
            aria-label="Close menu"
          >
            <svg className="w-5 h-5 text-gray-slate dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <nav className="flex-1 overflow-y-auto p-4">
          {/* Dashboard & Analytics Links */}
          <div className="mb-4 space-y-1 pb-4 border-b border-gray-light dark:border-gray-700">
            <Link
              href="/"
              onClick={onMobileMenuClose}
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                pathname === '/' 
                  ? 'bg-orange text-white' 
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-light dark:hover:bg-gray-700'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="font-medium">Dashboard</span>
            </Link>
            <Link
              href="/analytics"
              onClick={onMobileMenuClose}
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                pathname === '/analytics' 
                  ? 'bg-orange text-white' 
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-light dark:hover:bg-gray-700'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="font-medium">Analytics</span>
            </Link>
          </div>

          {/* Organizations Section */}
          <div className="mb-2">
            <h3 className="text-xs font-semibold text-gray-slate dark:text-gray-400 uppercase tracking-wider px-3 mb-2">
              Organizations
            </h3>
            {renderOrganizations()}
          </div>
        </nav>

        {/* Add Organization Button */}
        <div className="flex-shrink-0 p-4 border-t border-gray-light">
          <button
            onClick={() => setIsAddOrgModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange text-white rounded-md hover:bg-orange-hover transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Add Organization</span>
          </button>
        </div>
      </aside>

      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex bg-white dark:bg-orange-dark border-r border-gray-light transition-all duration-300 ${
          isCollapsed ? 'w-16' : 'w-64'
        } h-screen overflow-hidden sticky top-0 flex-col`}
      >
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-gray-light flex items-center justify-between">
          {!isCollapsed && (
            <h2 className="font-bold text-orange-dark dark:text-white">Organizations</h2>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-md transition-colors"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
          <svg
            className="w-5 h-5 text-gray-slate dark:text-gray-300"
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

      {/* Tree View */}
      <nav className="flex-1 overflow-y-auto p-4 pb-8 min-h-0" style={{ maxHeight: 'calc(100vh - 180px)' }}>
        {isCollapsed ? (
          // Collapsed view - show icons only
          <div className="flex flex-col space-y-2">
            {userOrganizations.map((org) => (
              <Link
                key={org.id}
                href={`/organization/${org.id}`}
                className="p-2 rounded-md transition-colors flex items-center justify-center hover:bg-gray-light dark:hover:bg-gray-700"
                title={org.name}
              >
                <svg
                  className="w-5 h-5 text-gray-slate dark:text-gray-300"
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
          // Expanded view - use shared render function
          renderOrganizations()
        )}
      </nav>
    </aside>

      {/* Add Organization Modal */}
      <AddOrganizationModal
        isOpen={isAddOrgModalOpen}
        onClose={() => setIsAddOrgModalOpen(false)}
        onSuccess={handleOrganizationSuccess}
      />
    </>
  );
}

// Sub-component to fetch and display environments for an organization
function EnvironmentsList({
  orgId,
  expandedEnvironments,
  handleToggleEnvironment,
  envContainerRefs,
  zoneContainerRefs,
}: {
  orgId: string;
  expandedEnvironments: Set<string>;
  handleToggleEnvironment: (envId: string) => void;
  envContainerRefs: React.MutableRefObject<{ [key: string]: HTMLDivElement | null }>;
  zoneContainerRefs: React.MutableRefObject<{ [key: string]: HTMLDivElement | null }>;
}) {
  const { data: environments, isLoading } = useEnvironments(orgId);

  if (isLoading) {
    return (
      <div className="ml-4 mt-1 px-2 py-1">
        <span className="text-sm text-gray-slate">Loading...</span>
      </div>
    );
  }

  if (!environments || environments.length === 0) {
    return (
      <div className="ml-4 mt-1 px-2 py-1">
        <span className="text-sm text-gray-slate italic">No environments</span>
      </div>
    );
  }

  return (
    <div 
      className="ml-4 mt-1 space-y-1 overflow-hidden"
      ref={(el) => {
        envContainerRefs.current[orgId] = el;
      }}
    >
      {environments.map((environment) => (
        <div key={environment.id} className="environment-item">
          <div className="flex items-center group">
            <button
              onClick={() => handleToggleEnvironment(environment.id)}
              className="p-1 rounded transition-colors"
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
              href={`/organization/${orgId}/environment/${environment.id}`}
              className="flex items-center space-x-2 px-2 py-1 rounded flex-1 transition-colors group-hover:text-orange"
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
            <ZonesList 
              environmentId={environment.id} 
              zoneContainerRefs={zoneContainerRefs}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// Helper function to truncate long zone names
function truncateZoneName(name: string, maxLength: number = 20): string {
  if (name.length <= maxLength) return name;
  return name.substring(0, maxLength) + '...';
}

// Sub-component to fetch and display zones for an environment
function ZonesList({ 
  environmentId, 
  zoneContainerRefs 
}: { 
  environmentId: string;
  zoneContainerRefs: React.MutableRefObject<{ [key: string]: HTMLDivElement | null }>;
}) {
  const { data: zones, isLoading } = useZones(environmentId);

  if (isLoading) {
    return (
      <div className="ml-4 mt-1 px-2 py-1">
        <span className="text-xs text-gray-slate">Loading zones...</span>
      </div>
    );
  }

  if (!zones || zones.length === 0) {
    return (
      <div className="ml-4 mt-1 px-2 py-1">
        <span className="text-xs text-gray-slate italic">No zones</span>
      </div>
    );
  }

  return (
    <div 
      className="ml-4 mt-1 space-y-1 overflow-hidden"
      ref={(el) => {
        zoneContainerRefs.current[environmentId] = el;
      }}
    >
      {zones.map((zone) => (
        <Link
          key={zone.id}
          href={`/zone/${zone.id}`}
          className="zone-item flex items-center space-x-2 px-2 py-1 rounded transition-colors group"
          title={zone.name}
        >
          <svg
            className="w-4 h-4 flex-shrink-0 text-gray-slate group-hover:text-orange"
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
          <span className="text-sm text-gray-slate group-hover:text-orange truncate">
            {truncateZoneName(zone.name)}
          </span>
        </Link>
      ))}
    </div>
  );
}
