'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { AdminHeader } from './AdminHeader';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const navigationItems = [
  { 
    href: '/admin', 
    label: 'Dashboard', 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    )
  },
  { 
    href: '/admin/users', 
    label: 'Users', 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    )
  },
  { 
    href: '/admin/organizations', 
    label: 'Organizations', 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    )
  },
  { 
    href: '/admin/audit', 
    label: 'Audit Log', 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )
  }
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLElement>(null);
  const hasAnimatedRef = useRef(false);
  const prevPathnameRef = useRef(pathname);

  // Animate on route change only
  useEffect(() => {
    // Skip on first render
    if (!hasAnimatedRef.current) {
      hasAnimatedRef.current = true;
      prevPathnameRef.current = pathname;
      return;
    }

    // Skip if pathname hasn't changed
    if (prevPathnameRef.current === pathname) {
      return;
    }

    if (contentRef.current) {
      // Scroll to top immediately
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
      }
      
      // Slide out to left + fade out, then slide in from right + fade in
      const timeline = gsap.timeline();
      
      timeline
        .to(contentRef.current, {
          opacity: 0,
          x: -30,
          duration: 0.3,
          ease: 'power2.in',
        })
        .fromTo(
          contentRef.current,
          {
            opacity: 0,
            x: 30,
          },
          {
            opacity: 1,
            x: 0,
            duration: 0.5,
            ease: 'power2.out',
          }
        );
    }

    prevPathnameRef.current = pathname;
  }, [pathname]);

  return (
    <div className="flex flex-col h-screen">
      {/* Header at top */}
      <AdminHeader />
      
      {/* Sidebar and content below */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={clsx(
            'bg-white border-r border-gray-light transition-all duration-300 overflow-hidden flex flex-col',
            isCollapsed ? 'w-16' : 'w-64'
          )}
        >
          {/* Sidebar Header */}
          <div className="flex-shrink-0 p-4 border-b border-gray-light flex items-center justify-between">
            {!isCollapsed && (
              <h2 className="font-bold text-orange-dark">Admin Panel</h2>
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

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-2">
            {isCollapsed ? (
              // Collapsed view - icons only
              <div className="flex flex-col space-y-2">
                {navigationItems.map((item) => {
                  // For /admin route, only highlight if exactly on /admin
                  // For other routes, highlight if exact match or nested
                  const isActive = item.href === '/admin' 
                    ? pathname === '/admin'
                    : pathname === item.href || pathname.startsWith(item.href + '/');
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={clsx(
                        'p-2 rounded-md transition-colors flex items-center justify-center',
                        isActive ? 'text-orange-dark bg-orange-light' : 'text-gray-slate'
                      )}
                      title={item.label}
                    >
                      {item.icon}
                    </Link>
                  );
                })}
              </div>
            ) : (
              // Expanded view - full menu
              navigationItems.map((item) => {
                // For /admin route, only highlight if exactly on /admin
                // For other routes, highlight if exact match or nested
                const isActive = item.href === '/admin' 
                  ? pathname === '/admin'
                  : pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link key={item.href} href={item.href}>
                    <div
                      className={clsx(
                        'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                        isActive
                          ? 'bg-orange-light text-orange-dark font-medium'
                          : 'text-gray-slate'
                      )}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </div>
                  </Link>
                );
              })
            )}
          </nav>

          {/* Footer */}
          {!isCollapsed && (
            <div className="p-4 border-t border-gray-light text-xs text-gray-slate">
              <p>Irongrove Admin v1.0</p>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main ref={containerRef} className="flex-1 overflow-auto bg-gray-50 dark:bg-orange-dark">
          <div ref={contentRef} className="p-8 max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
