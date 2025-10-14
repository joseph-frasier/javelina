'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useAuthStore } from '@/lib/auth-store';
import { mockOrganizations, getZonesByEnvironment } from '@/lib/mock-hierarchy-data';

export function Sidebar() {
  const { user } = useAuthStore();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedOrgs, setExpandedOrgs] = useState<Set<string>>(new Set(['org_company']));
  const [expandedEnvironments, setExpandedEnvironments] = useState<Set<string>>(new Set(['env_prod']));
  
  // Refs for GSAP animations
  const envContainerRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const zoneContainerRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  
  // Track previous state to detect newly expanded items
  const prevExpandedOrgs = useRef<Set<string>>(new Set(['org_company']));
  const prevExpandedEnvironments = useRef<Set<string>>(new Set(['env_prod']));

  // Filter organizations based on user's access
  // When logged in with Supabase, show user's organizations
  // When using mock auth (or not logged in), show all mock organizations for development
  const userOrganizations = user?.organizations && user.organizations.length > 0
    ? mockOrganizations.filter(org => 
        user.organizations?.some(userOrg => userOrg.id === org.id)
      )
    : mockOrganizations; // Fallback to all organizations for development/demo

  const toggleOrg = (orgId: string) => {
    const newExpanded = new Set(expandedOrgs);
    const isExpanding = !newExpanded.has(orgId);
    
    if (isExpanding) {
      // Expanding - add immediately
      newExpanded.add(orgId);
      setExpandedOrgs(newExpanded);
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
            newExpanded.delete(orgId);
            setExpandedOrgs(newExpanded);
            // Reset transform for next expansion
            gsap.set(container, { scaleY: 1, marginTop: '' });
          }
        });
      } else {
        // Fallback if no container
        newExpanded.delete(orgId);
        setExpandedOrgs(newExpanded);
      }
    }
  };

  const toggleEnvironment = (envId: string) => {
    const newExpanded = new Set(expandedEnvironments);
    const isExpanding = !newExpanded.has(envId);
    
    if (isExpanding) {
      // Expanding - add immediately
      newExpanded.add(envId);
      setExpandedEnvironments(newExpanded);
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
            newExpanded.delete(envId);
            setExpandedEnvironments(newExpanded);
            // Reset transform for next expansion
            gsap.set(container, { scaleY: 1, marginTop: '' });
          }
        });
      } else {
        // Fallback if no container
        newExpanded.delete(envId);
        setExpandedEnvironments(newExpanded);
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
          className="p-2 rounded-md transition-colors"
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
            disabled
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gray-light text-gray-slate rounded-md cursor-not-allowed opacity-50"
            title="Add Organization (Coming Soon)"
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
                className="p-2 rounded-md transition-colors flex items-center justify-center"
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
                  <div 
                    className="ml-4 mt-1 space-y-1 overflow-hidden"
                    ref={(el) => {
                      envContainerRefs.current[org.id] = el;
                    }}
                  >
                    {org.environments.map((environment) => (
                      <div key={environment.id} className="environment-item">
                        <div className="flex items-center group">
                          <button
                            onClick={() => toggleEnvironment(environment.id)}
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
                            href={`/organization/${org.id}/environment/${environment.id}`}
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
                          <div 
                            className="ml-4 mt-1 space-y-1 overflow-hidden"
                            ref={(el) => {
                              zoneContainerRefs.current[environment.id] = el;
                            }}
                          >
                            {getZonesByEnvironment(environment.id).map((zone) => (
                              <Link
                                key={zone.id}
                                href={`/zone/${zone.id}`}
                                className="zone-item flex items-center space-x-2 px-2 py-1 rounded transition-colors group"
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
                                <span className="text-sm text-gray-slate group-hover:text-orange break-all">
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
    </aside>
  );
}
