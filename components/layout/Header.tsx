'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import { useAuthStore } from '@/lib/auth-store';
import { useSettingsStore } from '@/lib/settings-store';
import { Logo } from '@/components/ui/Logo';
import { useHierarchyStore } from '@/lib/hierarchy-store';
import { useGlobalSearch } from '@/components/search/useGlobalSearch';
import { GlobalSearchModal } from '@/components/search/GlobalSearchModal';
import { useFeatureFlags } from '@/lib/hooks/useFeatureFlags';
import { useBusinessIntakeStore } from '@/lib/business-intake-store';

interface HeaderProps {
  onMenuToggle?: () => void;
  isMobileMenuOpen?: boolean;
}

export function Header({ onMenuToggle, isMobileMenuOpen = false }: HeaderProps = {}) {
  const router = useRouter();
  const { user, logout, profileReady } = useAuthStore();
  const { general, setTheme } = useSettingsStore();
  const { currentOrgId } = useHierarchyStore();
  const { showDomainsIntegration, showOpenSrsStorefront } = useFeatureFlags();
  const hasBusinessIntakes = useBusinessIntakeStore(
    (s) => Object.keys(s.intakes).length > 0,
  );
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const supportRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const search = useGlobalSearch({
    context: 'member',
    enabled: true,
    currentOrgId,
  });

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

  const userName = (() => {
    if (!user) return 'Unknown';
    if (user.display_name && user.display_name !== user.email) return user.display_name;
    if (user.name && user.name !== user.email) return user.name;

    const emailUsername = (user.email || '').split('@')[0];
    return emailUsername
      .split(/[._-]/)
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ') || 'Unknown';
  })();
  const userEmail = user?.email || '';
  const userRole = user?.role || 'user';
  const userInitial = userName.charAt(0).toUpperCase();
  const userAvatarUrl = user?.avatar_url;

  const handleLogout = async () => {
    setIsDropdownOpen(false);
    await logout();
  };

  const cycleTheme = () => {
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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.classList.remove('theme-light', 'theme-dark');
      document.documentElement.classList.add(`theme-${general.theme}`);
    }
  }, [general.theme]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationOpen(false);
      }
      if (supportRef.current && !supportRef.current.contains(event.target as Node)) {
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

  const iconButtonClass =
    'p-2 rounded-md text-text-muted hover:text-text hover:bg-surface-hover transition-colors focus-visible:outline-none focus-visible:shadow-focus-ring';

  return (
    <header
      className="bg-surface border-b border-border sticky top-0 z-50"
      role="banner"
    >
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onMenuToggle}
              className={clsx('md:hidden', iconButtonClass)}
              aria-label="Toggle navigation menu"
              aria-expanded={isMobileMenuOpen}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <Link href="/" className="flex items-center shrink-0" aria-label="Go to home page">
              <Logo width={325} height={130} priority className="h-20 w-auto" />
            </Link>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <nav className="hidden md:flex items-center gap-1 mr-2" role="navigation" aria-label="Main navigation">
              <Link
                href="/analytics"
                className="px-3 py-1.5 rounded-md text-sm text-text-muted hover:text-text hover:bg-surface-hover transition-colors"
              >
                Analytics
              </Link>
              {showDomainsIntegration && (
                <Link
                  href="/domains"
                  className="px-3 py-1.5 rounded-md text-sm text-text-muted hover:text-text hover:bg-surface-hover transition-colors"
                >
                  Domains
                </Link>
              )}
              {showOpenSrsStorefront && process.env.NEXT_PUBLIC_OPENSRS_STOREFRONT_URL && (
                <a
                  href={process.env.NEXT_PUBLIC_OPENSRS_STOREFRONT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-md text-sm text-text-muted hover:text-text hover:bg-surface-hover transition-colors"
                >
                  Purchase Domain
                </a>
              )}
              {hasBusinessIntakes && (
                <Link
                  href="/business"
                  className="text-gray-slate hover:text-orange font-regular text-sm transition-colors"
                >
                  My Business
                </Link>
              )}
            </nav>

            <button
              type="button"
              onClick={search.openSearch}
              className="hidden lg:flex w-60 xl:w-72 items-center justify-between rounded-md border border-border bg-surface-alt px-3 py-1.5 text-left text-sm text-text-muted transition-colors hover:border-border-strong hover:bg-surface-hover focus-visible:outline-none focus-visible:shadow-focus-ring"
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
                Global search
              </span>
              <kbd className="rounded bg-surface border border-border px-2 py-0.5 text-[11px] font-sans font-semibold tracking-wide text-text-muted">
                {search.shortcutBadge}
              </kbd>
            </button>

            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className={iconButtonClass}
                aria-label="View notifications"
                aria-expanded={isNotificationOpen}
                aria-haspopup="true"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
              </button>

              {isNotificationOpen && (
                <div
                  className="fixed sm:absolute right-2 sm:right-0 left-2 sm:left-auto mt-2 sm:w-80 bg-surface rounded-xl shadow-popover border border-border overflow-hidden z-50"
                  role="dialog"
                  aria-labelledby="notifications-heading"
                >
                  <div className="p-4 border-b border-border flex items-center justify-between">
                    <h3 id="notifications-heading" className="text-sm font-semibold text-text">
                      Notifications
                    </h3>
                    <button
                      className="text-xs text-accent hover:text-accent-hover transition-colors font-medium"
                      aria-label="Clear all notifications"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="p-8 text-center">
                    <p className="text-sm text-text-muted">No new notifications</p>
                  </div>
                </div>
              )}
            </div>

            <div className="relative" ref={supportRef}>
              <button
                onClick={() => setIsSupportOpen(!isSupportOpen)}
                className={iconButtonClass}
                aria-label="Contact support"
                aria-expanded={isSupportOpen}
                aria-haspopup="true"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </button>

              {isSupportOpen && (
                <div
                  className="fixed sm:absolute right-2 sm:right-0 left-2 sm:left-auto mt-2 sm:w-72 bg-surface rounded-xl shadow-popover border border-border overflow-hidden z-50"
                  role="dialog"
                  aria-labelledby="support-heading"
                >
                  <div className="p-4 border-b border-border">
                    <h3 id="support-heading" className="text-sm font-semibold text-text">
                      Need help or have feedback?
                    </h3>
                    <p className="text-xs text-text-muted mt-0.5">We&apos;d love to hear from you</p>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between gap-2 bg-surface-alt border border-border rounded-md px-3 py-2">
                      <span className="text-sm text-text-muted truncate font-mono" aria-label="Support email address">
                        {supportEmail}
                      </span>
                      <button
                        onClick={handleCopyEmail}
                        className="flex-shrink-0 p-1.5 text-text-muted hover:text-text transition-colors rounded-md hover:bg-surface-hover"
                        aria-label={copied ? 'Email copied to clipboard' : 'Copy email address to clipboard'}
                      >
                        {copied ? (
                          <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                    <a
                      href={`mailto:${supportEmail}`}
                      className="mt-3 block w-full text-center px-4 py-2 text-sm font-medium text-white bg-accent hover:bg-accent-hover rounded-md transition-colors"
                    >
                      Send email
                    </a>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={cycleTheme}
              className={iconButtonClass}
              aria-label={`Theme: ${general.theme} (press to change)`}
              title={`Current theme: ${general.theme}`}
            >
              {getThemeIcon()}
            </button>

            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-8 h-8 bg-accent rounded-full flex items-center justify-center hover:bg-accent-hover transition-colors focus-visible:outline-none focus-visible:shadow-focus-ring overflow-hidden ml-1"
                aria-label={`User menu for ${userName}`}
                aria-expanded={isDropdownOpen}
                aria-haspopup="true"
              >
                {userAvatarUrl ? (
                  <img
                    src={userAvatarUrl}
                    alt={`${userName} avatar`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white font-semibold text-sm" aria-hidden="true">
                    {userInitial}
                  </span>
                )}
              </button>

              {isDropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-64 bg-surface rounded-xl shadow-popover border border-border overflow-hidden"
                  role="menu"
                  aria-labelledby="user-menu-heading"
                >
                  <div className="p-4 border-b border-border">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 bg-accent rounded-full flex items-center justify-center overflow-hidden shrink-0"
                        aria-hidden="true"
                      >
                        {userAvatarUrl ? (
                          <img src={userAvatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-white font-semibold text-base">{userInitial}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p id="user-menu-heading" className="text-sm font-medium text-text truncate">
                          {userName}
                        </p>
                        <p className="text-xs text-text-muted truncate">{userEmail}</p>
                        {userRole === 'superuser' && (
                          <p className="text-xs font-semibold text-accent truncate mt-0.5">Super User</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="py-1">
                    <Link
                      href="/profile"
                      className="block px-4 py-2 text-sm text-text hover:bg-surface-hover transition-colors"
                      onClick={() => setIsDropdownOpen(false)}
                      role="menuitem"
                    >
                      Profile
                    </Link>
                    <Link
                      href="/settings"
                      className="block px-4 py-2 text-sm text-text hover:bg-surface-hover transition-colors"
                      onClick={() => setIsDropdownOpen(false)}
                      role="menuitem"
                    >
                      Settings
                    </Link>
                    <button
                      className="w-full text-left px-4 py-2 text-sm text-text hover:bg-surface-hover transition-colors"
                      onClick={handleLogout}
                      role="menuitem"
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
      <GlobalSearchModal context="member" search={search} />
    </header>
  );
}
