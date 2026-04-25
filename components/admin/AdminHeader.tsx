'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getAdminUser } from '@/lib/admin-auth';
import { useSettingsStore } from '@/lib/settings-store';
import { Logo } from '@/components/ui/Logo';
import { useGlobalSearch } from '@/components/search/useGlobalSearch';
import { GlobalSearchModal } from '@/components/search/GlobalSearchModal';

interface AdminHeaderProps {
  onMenuToggle?: () => void;
}

export function AdminHeader({ onMenuToggle }: AdminHeaderProps = {}) {
  const router = useRouter();
  const { general, setTheme } = useSettingsStore();
  const [admin, setAdmin] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const supportRef = useRef<HTMLDivElement>(null);

  const supportEmail = 'javelina@irongrove.com';

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(supportEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy email:', err);
    }
  };

  useEffect(() => {
    const fetchAdmin = async () => {
      const user = await getAdminUser();
      setAdmin(user);
      setLoading(false);
    };
    fetchAdmin();
  }, []);

  const handleLogout = () => {
    setIsDropdownOpen(false);
    window.location.href = '/api/logout';
  };

  const cycleTheme = () => {
    // Toggle between light and dark
    const nextTheme = general.theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
  };

  const getThemeIcon = () => {
    if (general.theme === 'light') {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
      </svg>
    );
  };

  // Apply theme on mount and when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.classList.remove('theme-light', 'theme-dark');
      document.documentElement.classList.add(`theme-${general.theme}`);
    }
  }, [general.theme]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node)
      ) {
        setIsNotificationOpen(false);
      }
      if (
        supportRef.current &&
        !supportRef.current.contains(event.target as Node)
      ) {
        setIsSupportOpen(false);
      }
    }

    if (isDropdownOpen || isNotificationOpen || isSupportOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen, isNotificationOpen, isSupportOpen]);

  const adminName = admin?.name || 'Admin User';
  const adminEmail = admin?.email || '';
  const adminInitial = adminName.charAt(0).toUpperCase();
  const search = useGlobalSearch({
    context: 'admin',
    enabled: true,
  });

  return (
    <header className="bg-surface border-b border-border">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            {/* Hamburger Menu Button - Mobile Only */}
            <button
              onClick={onMenuToggle}
              className="md:hidden p-2 rounded-md text-text-muted hover:text-accent hover:bg-surface-hover transition-colors"
              aria-label="Toggle menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <Link href="/admin" className="flex items-center">
              <Logo
                width={325}
                height={130}
                priority
                className="h-20 w-auto"
              />
            </Link>
          </div>

          <div className="flex items-center space-x-6">
            {/* Notifications */}
            <div className="relative" ref={notificationRef}>
              <button 
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className="p-2 text-text-muted hover:text-accent transition-colors focus:outline-none"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
              </button>

              {isNotificationOpen && (
                <div className="fixed sm:absolute right-2 sm:right-0 left-2 sm:left-auto mt-2 sm:w-80 bg-surface rounded-xl shadow-lg border border-border overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="p-4 border-b border-border flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-text">Notifications</h3>
                    <button className="text-xs text-accent hover:text-text transition-colors font-medium">
                      Clear All
                    </button>
                  </div>
                  <div className="p-8 text-center">
                    <p className="text-sm text-text-muted">No new notifications</p>
                  </div>
                </div>
              )}
            </div>

            {/* Support */}
            <div className="relative" ref={supportRef}>
              <button 
                onClick={() => setIsSupportOpen(!isSupportOpen)}
                className="p-2 text-text-muted hover:text-accent transition-colors focus:outline-none"
                title="Support"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </button>

              {isSupportOpen && (
                <div className="fixed sm:absolute right-2 sm:right-0 left-2 sm:left-auto mt-2 sm:w-72 bg-surface rounded-xl shadow-lg border border-border overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="p-4 border-b border-border">
                    <h3 className="text-sm font-semibold text-text">Need help or have feedback?</h3>
                    <p className="text-xs text-text-muted mt-1">We&apos;d love to hear from you</p>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between gap-2 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
                      <span className="text-sm text-text-muted truncate">{supportEmail}</span>
                      <button
                        onClick={handleCopyEmail}
                        className="flex-shrink-0 p-1.5 text-text-muted hover:text-accent transition-colors rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
                        title={copied ? 'Copied!' : 'Copy email'}
                      >
                        {copied ? (
                          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    <a
                      href={`mailto:${supportEmail}`}
                      className="mt-3 block w-full text-center px-4 py-2 text-sm font-medium text-white bg-accent hover:bg-accent-hover rounded-lg transition-colors"
                    >
                      Send Email
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Theme Toggle */}
            <button
              onClick={cycleTheme}
              className="p-2 text-text-muted hover:text-accent transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 rounded-md"
              aria-label={`Theme: ${general.theme} (press to change)`}
              title={`Current theme: ${general.theme}`}
            >
              {getThemeIcon()}
            </button>

            <button
              type="button"
              onClick={search.openSearch}
              className="hidden md:flex w-72 items-center justify-between rounded-md border border-border bg-surface-alt px-4 py-2 text-left text-sm text-text-muted transition-colors hover:border-accent hover:bg-surface-hover"
              aria-label="Open global search"
            >
              <span className="flex items-center gap-2">
                <svg
                  className="h-4 w-4 text-text-faint"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                Global Search
              </span>
              <span className="rounded bg-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                {search.shortcutBadge}
              </span>
            </button>

            {/* User Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-8 h-8 bg-accent rounded-full flex items-center justify-center hover:bg-accent-hover transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
              >
                <span className="text-white font-bold text-base">
                  {adminInitial}
                </span>
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-surface rounded-xl shadow-lg border border-border overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="p-4 border-b border-border">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-lg">
                          {adminInitial}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text truncate">
                          {adminName}
                        </p>
                        <p className="text-xs text-text-muted truncate">
                          {adminEmail}
                        </p>
                        <p className="text-xs font-semibold text-accent truncate">
                          Administrator
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="py-2">
                    <button
                      className="w-full text-left px-4 py-2 text-sm text-text-muted hover:bg-surface-hover hover:text-accent transition-colors"
                      onClick={handleLogout}
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <GlobalSearchModal context="admin" search={search} />
    </header>
  );
}
