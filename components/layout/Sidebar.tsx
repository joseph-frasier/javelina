'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useAuthStore } from '@/lib/auth-store';
import { useHierarchyStore } from '@/lib/hierarchy-store';
import { useZones } from '@/lib/hooks/useZones';
import { useTags } from '@/lib/hooks/useTags';
import { AddOrganizationModal } from '@/components/modals/AddOrganizationModal';
import { type Tag, type ZoneTagAssignment } from '@/lib/api-client';

interface SidebarProps {
  isMobileMenuOpen?: boolean;
  onMobileMenuClose?: () => void;
}

export function Sidebar({ 
  isMobileMenuOpen = false, 
  onMobileMenuClose,
}: SidebarProps = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { expandedOrgs, toggleOrg, selectAndExpand } = useHierarchyStore();
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Refs for GSAP animations
  const sidebarRef = useRef<HTMLDivElement>(null);
  const zoneContainerRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  
  // Track previous state to detect newly expanded items
  const prevExpandedOrgs = useRef<Set<string>>(new Set());

  // Get organizations from authenticated user (already from Supabase)
  const userOrganizations = user?.organizations || [];
  const [isAddOrgModalOpen, setIsAddOrgModalOpen] = useState(false);

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
          x: '-100%',
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
                title={org.name}
                onClick={() => {
                  // #region agent log
                  fetch('http://127.0.0.1:7242/ingest/32135cbf-ee74-464b-941b-1e48a621a121',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Sidebar.tsx:100',message:'Organization link clicked',data:{orgId:org.id,orgName:org.name,href:`/organization/${org.id}`,localStorageBefore:typeof window !== 'undefined' ? window.localStorage.getItem('hierarchy-storage') : null},timestamp:Date.now(),sessionId:'debug-session',runId:'org-switch',hypothesisId:'A'})}).catch(()=>{});
                  // #endregion
                }}
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
                  {truncateName(org.name)}
                </span>
              </Link>
            </div>

            {/* Zones (directly under organization) */}
            {expandedOrgs.has(org.id) && (
              <ZonesList
                organizationId={org.id}
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
      const container = zoneContainerRefs.current[orgId];
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

  // Animate zones when organizations are expanded
  useGSAP(() => {
    // Find newly expanded org (present in current but not in previous)
    const newlyExpandedOrg = Array.from(expandedOrgs).find(
      orgId => !prevExpandedOrgs.current.has(orgId)
    );
    
    if (newlyExpandedOrg) {
      const container = zoneContainerRefs.current[newlyExpandedOrg];
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
    prevExpandedOrgs.current = new Set(expandedOrgs);
  }, [expandedOrgs]);

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
        className={`fixed top-16 left-0 bottom-0 bg-white dark:bg-orange-dark overflow-hidden flex flex-col z-50 md:hidden w-full -translate-x-full`}
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
        <nav className="flex-1 overflow-y-auto p-4 pb-24" role="navigation" aria-label="Sidebar navigation">
          {/* Analytics Link */}
          <div className="mb-4 space-y-1 pb-4 border-b border-gray-light dark:border-gray-700">
            <Link
              href="/analytics"
              onClick={onMobileMenuClose}
              className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-gray-slate dark:text-gray-300 hover:bg-gray-light dark:hover:bg-gray-700"
              aria-label="Go to analytics page"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="font-medium">Analytics</span>
            </Link>
          </div>

          {/* Organizations Section */}
          <div className="mb-2">
            <h3 id="organizations-heading" className="text-xs font-semibold text-gray-slate dark:text-gray-400 uppercase tracking-wider px-3 mb-2 text-center">
              Organizations
            </h3>
            <div role="list" aria-labelledby="organizations-heading">
              {renderOrganizations()}
            </div>
          </div>
        </nav>

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
            <h2 className="font-bold text-orange-dark dark:text-white text-center flex-1">Organizations</h2>
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
      <nav className="flex-1 overflow-y-auto p-4 pb-8 min-h-0" style={{ maxHeight: 'calc(100vh - 240px)' }}>
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

// Helper function to truncate long names (orgs, zones)
function truncateName(name: string, maxLength: number = 20): string {
  if (name.length <= maxLength) return name;
  return name.substring(0, maxLength) + '...';
}

// Sub-component to fetch and display zones for an organization
function ZonesList({ 
  organizationId, 
  zoneContainerRefs,
}: { 
  organizationId: string;
  zoneContainerRefs: React.MutableRefObject<{ [key: string]: HTMLDivElement | null }>;
}) {
  const { data: zones, isLoading } = useZones(organizationId);
  const { data: tagsData } = useTags(organizationId);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Get tags and assignments from the hook
  const displayTags = tagsData?.tags || [];
  const displayAssignments = tagsData?.assignments || [];

  // Sort zones alphabetically
  const sortedZones = [...(zones || [])].sort((a: { id: string; name: string }, b: { id: string; name: string }) => {
    return sortOrder === 'asc' 
      ? a.name.localeCompare(b.name)
      : b.name.localeCompare(a.name);
  });

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
      className="ml-4 mt-1 overflow-hidden"
      ref={(el) => {
        zoneContainerRefs.current[organizationId] = el;
      }}
    >
      {/* Sort Toggle */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        }}
        className="flex items-center gap-1 px-2 py-0.5 mb-1 text-xs text-gray-slate hover:text-orange transition-colors"
        title={sortOrder === 'asc' ? 'Sorted A-Z (click for Z-A)' : 'Sorted Z-A (click for A-Z)'}
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9M3 12h5" />
        </svg>
        <span>{sortOrder === 'asc' ? 'A-Z' : 'Z-A'}</span>
        <svg className={`w-3 h-3 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Zones List */}
      <div className="space-y-1">
      {sortedZones.map((zone) => {
        // Get tags assigned to this zone
        const assignment = displayAssignments.find(a => a.zone_id === zone.id);
        const zoneTagIds = assignment?.tag_ids || [];
        const zoneTags = zoneTagIds
          .map(tagId => displayTags.find(tag => tag.id === tagId))
          .filter((tag): tag is Tag => tag !== undefined);
        
        return (
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
            <span className="text-sm text-gray-slate group-hover:text-orange truncate flex-1">
              {truncateName(zone.name)}
            </span>
            {/* Tag dots */}
            {zoneTags.length > 0 && (
              <span className="flex gap-0.5 flex-shrink-0">
                {zoneTags.slice(0, 3).map((tag) => (
                  <span
                    key={tag.id}
                    className="w-[6px] h-[6px] rounded-full"
                    style={{ backgroundColor: tag.color }}
                    title={tag.name}
                  />
                ))}
              </span>
            )}
          </Link>
        );
      })}
      </div>
    </div>
  );
}
