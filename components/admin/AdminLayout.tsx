'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { AdminHeader } from './AdminHeader';
import { AIChatWidget } from '@/components/chat/AIChatWidget';

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
    href: '/admin/discounts', 
    label: 'Discounts', 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const prevPathnameRef = useRef<string | null>(null);

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

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Animate on every pathname change (including first load)
  useEffect(() => {
    if (contentRef.current) {
      // If this is the first render, just do a simple fade in from right
      if (prevPathnameRef.current === null) {
        gsap.fromTo(
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
      } else if (prevPathnameRef.current !== pathname) {
        // On route change, do the full slide out/in animation
        // Scroll to top immediately
        if (containerRef.current) {
          containerRef.current.scrollTop = 0;
        }
        
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
    }

    prevPathnameRef.current = pathname;
  }, [pathname]);

  return (
    <div className="flex flex-col h-screen">
      {/* Header at top */}
      <AdminHeader onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />
      
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      
      {/* Sidebar and content below */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Mobile */}
        <aside
          ref={sidebarRef}
          className={clsx(
            'fixed top-16 left-0 bottom-0 bg-white overflow-hidden flex flex-col z-50 md:hidden',
            'w-full -translate-x-full'
          )}
        >
          {/* Sidebar Header */}
          <div className="flex-shrink-0 p-4 border-b border-gray-light flex items-center justify-between">
            <h2 className="font-bold text-orange-dark">Admin Panel</h2>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 rounded-md transition-colors hover:bg-gray-light"
              aria-label="Close menu"
            >
              <svg className="w-5 h-5 text-gray-slate" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 pb-20 space-y-2">
            {navigationItems.map((item) => {
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
                        : 'text-gray-slate hover:bg-gray-light/30'
                    )}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-light text-xs text-gray-slate">
            <p>Irongrove Admin v1.0</p>
          </div>
        </aside>

        {/* Sidebar - Desktop */}
        <aside
          className={clsx(
            'hidden md:flex bg-white border-r border-gray-light transition-all duration-300 overflow-hidden flex-col',
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
          <div ref={contentRef} className="p-4 sm:p-6 md:p-8 w-full">
            {children}
          </div>
        </main>
      </div>
      <AIChatWidget />
    </div>
  );
}
