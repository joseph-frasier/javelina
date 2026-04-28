'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { clsx } from 'clsx';
import { useAuthStore } from '@/lib/auth-store';
import { useHierarchyStore } from '@/lib/hierarchy-store';
import { useZones } from '@/lib/hooks/useZones';
import { useTags } from '@/lib/hooks/useTags';
import { AddOrganizationModal } from '@/components/modals/AddOrganizationModal';
import { FeedbackModal } from '@/components/modals/FeedbackModal';
import { organizationsApi } from '@/lib/api-client';
import { type Tag, type ZoneTagAssignment } from '@/lib/api-client';
import { useFeatureFlags } from '@/lib/hooks/useFeatureFlags';

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
  const { showDomainsIntegration, showOpenSrsStorefront } = useFeatureFlags();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const sidebarRef = useRef<HTMLDivElement>(null);
  const zoneContainerRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const prevExpandedOrgs = useRef<Set<string>>(new Set());

  const userOrganizations = user?.organizations || [];
  const [isAddOrgModalOpen, setIsAddOrgModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);

  const [pendingCheckoutOrgIds, setPendingCheckoutOrgIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!user?.organizations?.length) {
      setPendingCheckoutOrgIds(new Set());
      return;
    }
    const fromProfile = new Set(
      user.organizations
        .filter((org) => org.pending_plan_code)
        .map((org) => org.id)
    );
    if (fromProfile.size > 0) {
      setPendingCheckoutOrgIds(fromProfile);
      return;
    }
    Promise.all(
      user.organizations.map((org) =>
        organizationsApi.get(org.id).catch(() => null)
      )
    )
      .then((results) => {
        const pending = new Set(
          results
            .filter((o: any) => o?.pending_plan_code)
            .map((o: any) => o.id)
        );
        setPendingCheckoutOrgIds(pending);
      })
      .catch(() => setPendingCheckoutOrgIds(new Set()));
  }, [user?.organizations]);

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

  const handleOrganizationSuccess = (organizationId: string, _organizationName: string) => {
    selectAndExpand(organizationId);
    router.push(`/organization/${organizationId}`);
    if (onMobileMenuClose) {
      onMobileMenuClose();
    }
  };

  const handleToggleOrg = (orgId: string) => {
    const isExpanding = !expandedOrgs.has(orgId);

    if (isExpanding) {
      toggleOrg(orgId);
    } else {
      const container = zoneContainerRefs.current[orgId];
      if (container) {
        const zones = container.querySelectorAll('.zone-item');

        gsap.to(zones, {
          opacity: 0,
          x: -20,
          duration: 0.25,
          stagger: 0.02,
          ease: 'power2.in',
        });

        gsap.to(container, {
          scaleY: 0,
          transformOrigin: 'top',
          marginTop: 0,
          duration: 0.3,
          delay: 0.15,
          ease: 'power2.inOut',
          onComplete: () => {
            toggleOrg(orgId);
            gsap.set(container, { scaleY: 1, marginTop: '' });
          },
        });
      } else {
        toggleOrg(orgId);
      }
    }
  };

  useGSAP(() => {
    const newlyExpandedOrg = Array.from(expandedOrgs).find(
      (orgId) => !prevExpandedOrgs.current.has(orgId)
    );

    if (newlyExpandedOrg) {
      const container = zoneContainerRefs.current[newlyExpandedOrg];
      if (container) {
        const zones = container.querySelectorAll('.zone-item');
        gsap.fromTo(
          zones,
          { opacity: 0, x: -20 },
          {
            opacity: 1,
            x: 0,
            duration: 0.4,
            stagger: 0.04,
            ease: 'power2.out',
          }
        );
      }
    }

    prevExpandedOrgs.current = new Set(expandedOrgs);
  }, [expandedOrgs]);

  const renderOrganizations = () => {
    return (
      <div className="space-y-0.5">
        {userOrganizations.map((org) => {
          const hasPendingCheckout =
            !!org.pending_plan_code || pendingCheckoutOrgIds.has(org.id);
          const isExpanded = expandedOrgs.has(org.id);
          return (
            <div key={org.id}>
              <div className="flex items-center group rounded-md hover:bg-surface-hover">
                <button
                  onClick={() => handleToggleOrg(org.id)}
                  className="p-1 rounded transition-colors text-text-muted"
                  aria-label={isExpanded ? 'Collapse' : 'Expand'}
                >
                  <svg
                    className={clsx(
                      'w-3.5 h-3.5 transition-transform duration-150',
                      isExpanded && 'rotate-90'
                    )}
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
                  className="flex items-center gap-2 px-1.5 py-1.5 rounded flex-1 min-w-0 text-text hover:text-text"
                  title={org.name}
                >
                  <svg
                    aria-hidden
                    className={clsx(
                      'w-4 h-4 shrink-0',
                      hasPendingCheckout ? 'text-warning' : 'text-accent'
                    )}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.75}
                      d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"
                    />
                  </svg>
                  <span className="text-sm font-medium truncate flex-1">
                    {truncateName(org.name)}
                  </span>
                  {hasPendingCheckout && (
                    <svg
                      className="w-3.5 h-3.5 flex-shrink-0 text-warning"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      role="img"
                    >
                      <title>Payment incomplete</title>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  )}
                </Link>
              </div>

              {isExpanded && (
                <ZonesList
                  organizationId={org.id}
                  zoneContainerRefs={zoneContainerRefs}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const feedbackButton = (compact: boolean) => (
    <button
      onClick={() => {
        setIsFeedbackModalOpen(true);
        if (onMobileMenuClose) onMobileMenuClose();
      }}
      className={clsx(
        'w-full flex items-center gap-2.5 rounded-md border border-border bg-surface-alt text-text hover:bg-surface-hover hover:border-border-strong transition-colors focus-visible:outline-none focus-visible:shadow-focus-ring',
        compact ? 'justify-center p-2' : 'px-3 py-2.5'
      )}
      aria-label="Submit a ticket"
      title={compact ? 'Submit a ticket' : undefined}
    >
      <svg
        className="w-4 h-4 flex-shrink-0 text-text-muted"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
        />
      </svg>
      {!compact && <span className="text-sm font-medium">Submit a ticket</span>}
    </button>
  );

  return (
    <>
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onMobileMenuClose}
        />
      )}

      <aside
        ref={sidebarRef}
        className="fixed top-16 left-0 bottom-0 bg-surface border-r border-border overflow-hidden flex flex-col z-50 md:hidden w-full -translate-x-full"
      >
        <div className="flex-shrink-0 p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-text text-sm">Navigation</h2>
          <button
            onClick={onMobileMenuClose}
            className="p-1.5 rounded-md transition-colors text-text-muted hover:bg-surface-hover hover:text-text"
            aria-label="Close menu"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <nav
          className="flex-1 overflow-y-auto p-4 pb-24"
          role="navigation"
          aria-label="Sidebar navigation"
        >
          <div className="mb-4 space-y-0.5 pb-4 border-b border-border">
            <Link
              href="/analytics"
              onClick={onMobileMenuClose}
              className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-text-muted hover:bg-surface-hover hover:text-text"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <span className="text-sm font-medium">Analytics</span>
            </Link>
            {showDomainsIntegration && (
              <Link
                href="/domains"
                onClick={onMobileMenuClose}
                className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-text-muted hover:bg-surface-hover hover:text-text"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
                  />
                </svg>
                <span className="text-sm font-medium">Domains</span>
              </Link>
            )}
            {showOpenSrsStorefront && process.env.NEXT_PUBLIC_OPENSRS_STOREFRONT_URL && (
              <a
                href={process.env.NEXT_PUBLIC_OPENSRS_STOREFRONT_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onMobileMenuClose}
                className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-text-muted hover:bg-surface-hover hover:text-text"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z"
                  />
                </svg>
                <span className="text-sm font-medium">Purchase domain</span>
              </a>
            )}
          </div>

          <div className="mb-2">
            <h3
              id="organizations-heading"
              className="text-[11px] font-semibold text-text-faint uppercase tracking-wider px-2 mb-1.5"
            >
              Organizations
            </h3>
            <div role="list" aria-labelledby="organizations-heading">
              {renderOrganizations()}
            </div>
          </div>
        </nav>

        <div className="flex-shrink-0 p-4 border-t border-border">
          {feedbackButton(false)}
        </div>
      </aside>

      <aside
        className={clsx(
          'hidden md:flex bg-surface border-r border-border transition-all duration-300 h-full overflow-hidden flex-col',
          isCollapsed ? 'w-16' : 'w-64'
        )}
      >
        <div className="flex-shrink-0 p-3 border-b border-border flex items-center justify-between">
          {!isCollapsed && (
            <h2 className="text-[11px] font-semibold text-text-faint uppercase tracking-wider px-2">
              Organizations
            </h2>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-md text-text-muted hover:bg-surface-hover hover:text-text transition-colors"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg
              className="w-4 h-4"
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

        <nav className="flex-1 overflow-y-auto p-3 pb-4 min-h-0">
          {isCollapsed ? (
            <div className="flex flex-col space-y-1">
              {userOrganizations.map((org) => (
                <Link
                  key={org.id}
                  href={`/organization/${org.id}`}
                  className="p-2 rounded-md transition-colors flex items-center justify-center text-text-muted hover:bg-surface-hover hover:text-text"
                  title={org.name}
                >
                  <svg
                    className="w-4 h-4"
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
            renderOrganizations()
          )}
        </nav>

        <div className="flex-shrink-0 p-3 border-t border-border">
          {feedbackButton(isCollapsed)}
        </div>
      </aside>

      <AddOrganizationModal
        isOpen={isAddOrgModalOpen}
        onClose={() => setIsAddOrgModalOpen(false)}
        onSuccess={handleOrganizationSuccess}
      />

      <FeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
      />
    </>
  );
}

function truncateName(name: string, maxLength: number = 22): string {
  if (name.length <= maxLength) return name;
  return name.substring(0, maxLength) + '...';
}

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
  const [showAll, setShowAll] = useState(false);
  const ZONES_PREVIEW_COUNT = 5;

  const displayTags = tagsData?.tags || [];
  const displayAssignments = tagsData?.assignments || [];

  const sortedZones = [...(zones || [])].sort(
    (a: { id: string; name: string }, b: { id: string; name: string }) => {
      return sortOrder === 'asc'
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name);
    }
  );

  if (isLoading) {
    return (
      <div className="ml-6 mt-1 px-2 py-1">
        <span className="text-xs text-text-faint">Loading zones...</span>
      </div>
    );
  }

  if (!zones || zones.length === 0) {
    return (
      <div className="ml-6 mt-1 px-2 py-1">
        <span className="text-xs text-text-faint italic">No zones</span>
      </div>
    );
  }

  return (
    <div
      className="ml-6 mt-1 overflow-hidden"
      ref={(el) => {
        zoneContainerRefs.current[organizationId] = el;
      }}
    >
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
        }}
        className="flex items-center gap-1 px-2 py-0.5 mb-1 text-[11px] text-text-faint hover:text-text transition-colors"
        title={sortOrder === 'asc' ? 'Sorted A-Z (click for Z-A)' : 'Sorted Z-A (click for A-Z)'}
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9M3 12h5" />
        </svg>
        <span>{sortOrder === 'asc' ? 'A-Z' : 'Z-A'}</span>
        <svg
          className={clsx('w-3 h-3 transition-transform', sortOrder === 'desc' && 'rotate-180')}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div className="space-y-0.5">
        {(showAll ? sortedZones : sortedZones.slice(0, ZONES_PREVIEW_COUNT)).map((zone) => {
          const assignment = displayAssignments.find((a) => a.zone_id === zone.id);
          const zoneTagIds = assignment?.tag_ids || [];
          const zoneTags = zoneTagIds
            .map((tagId) => displayTags.find((tag) => tag.id === tagId))
            .filter((tag): tag is Tag => tag !== undefined);

          return (
            <Link
              key={zone.id}
              href={`/zone/${zone.id}`}
              className="zone-item flex items-center gap-2 px-2 py-1.5 rounded transition-colors group hover:bg-surface-hover"
              title={zone.name}
            >
              <svg
                className="w-3.5 h-3.5 flex-shrink-0 text-text-muted group-hover:text-text"
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
              <span className="text-[13px] text-text-muted group-hover:text-text truncate flex-1">
                {truncateName(zone.name)}
              </span>
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
      {sortedZones.length > ZONES_PREVIEW_COUNT && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowAll((prev) => !prev);
          }}
          className="flex items-center gap-1 px-2 py-1 mt-1 text-[11px] text-text-faint hover:text-text transition-colors"
        >
          <span>{showAll ? 'Show less' : 'Show all'}</span>
        </button>
      )}
    </div>
  );
}
