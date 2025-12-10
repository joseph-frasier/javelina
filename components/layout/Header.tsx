'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { useSettingsStore } from '@/lib/settings-store';
import { Logo } from '@/components/ui/Logo';

interface HeaderProps {
  onMenuToggle?: () => void;
  isMobileMenuOpen?: boolean;
}

export function Header({ onMenuToggle, isMobileMenuOpen = false }: HeaderProps = {}) {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { general, setTheme } = useSettingsStore();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const supportRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const supportEmail = 'support@irongrove.com';

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(supportEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy email:', err);
    }
  };

  // Get user details from Supabase auth user
  // Type assertions needed since we're extending the User type with custom properties
  const userName = (user as any)?.profile?.name || (user as any)?.user_metadata?.name || user?.email?.split('@')[0] || 'User';
  const userEmail = user?.email || '';
  const userRole = (user as any)?.profile?.role || 'user';
  const userInitial = userName.charAt(0).toUpperCase();
  const userAvatarUrl = (user as any)?.profile?.avatar_url || (user as any)?.avatar_url;

  const handleLogout = () => {
    logout();
    router.push('/login');
    setIsDropdownOpen(false);
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

  return (
    <header className="bg-white dark:bg-orange-dark border-b border-gray-light sticky top-0 z-50 [&]:!border-b-gray-light dark:[&]:!border-b-gray-700" role="banner">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            {/* Hamburger Menu Button - Mobile Only */}
            <button
              onClick={onMenuToggle}
              className="md:hidden p-2 rounded-md text-gray-slate hover:text-orange hover:bg-gray-light/30 transition-colors"
              aria-label="Toggle navigation menu"
              aria-expanded={isMobileMenuOpen}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <Link href="/" className="flex items-center" aria-label="Go to home page">
              <Logo
                width={325}
                height={130}
                priority
                className="h-20 w-auto"
              />
            </Link>
          </div>

          <div className="flex items-center space-x-6">
            <nav className="hidden md:flex items-center space-x-6" role="navigation" aria-label="Main navigation">
              <Link
                href="/analytics"
                className="text-gray-slate hover:text-orange font-regular text-sm transition-colors"
              >
                Analytics
              </Link>
            </nav>
            <div className="relative" ref={notificationRef}>
              <button 
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className="p-2 text-gray-slate hover:text-orange transition-colors focus:outline-none"
                aria-label="View notifications"
                aria-expanded={isNotificationOpen}
                aria-haspopup="true"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
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
                <div className="fixed sm:absolute right-2 sm:right-0 left-2 sm:left-auto mt-2 sm:w-80 bg-white dark:bg-gray-slate rounded-xl shadow-lg border border-gray-light overflow-hidden z-50" role="dialog" aria-labelledby="notifications-heading">
                  <div className="p-4 border-b border-gray-light flex items-center justify-between">
                    <h3 id="notifications-heading" className="text-sm font-semibold text-orange-dark dark:text-orange">Notifications</h3>
                    <button className="text-xs text-orange hover:text-orange-dark transition-colors font-medium" aria-label="Clear all notifications">
                      Clear All
                    </button>
                  </div>
                  <div className="p-8 text-center">
                    <p className="text-sm text-gray-slate dark:text-gray-300">No new notifications</p>
                  </div>
                </div>
              )}
            </div>

            {/* Support */}
            <div className="relative" ref={supportRef}>
              <button 
                onClick={() => setIsSupportOpen(!isSupportOpen)}
                className="p-2 text-gray-slate hover:text-orange transition-colors focus:outline-none"
                aria-label="Contact support"
                aria-expanded={isSupportOpen}
                aria-haspopup="true"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
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
                <div className="fixed sm:absolute right-2 sm:right-0 left-2 sm:left-auto mt-2 sm:w-72 bg-white dark:bg-gray-slate rounded-xl shadow-lg border border-gray-light overflow-hidden z-50" role="dialog" aria-labelledby="support-heading">
                  <div className="p-4 border-b border-gray-light">
                    <h3 id="support-heading" className="text-sm font-semibold text-orange-dark dark:text-orange">Need help or have feedback?</h3>
                    <p className="text-xs text-gray-slate dark:text-gray-300 mt-1">We&apos;d love to hear from you</p>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between gap-2 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
                      <span className="text-sm text-gray-slate dark:text-gray-300 truncate" aria-label="Support email address">{supportEmail}</span>
                      <button
                        onClick={handleCopyEmail}
                        className="flex-shrink-0 p-1.5 text-gray-slate hover:text-orange transition-colors rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
                        aria-label={copied ? 'Email copied to clipboard' : 'Copy email address to clipboard'}
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
                      className="mt-3 block w-full text-center px-4 py-2 text-sm font-medium text-white bg-orange hover:bg-orange-dark rounded-lg transition-colors"
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
              className="p-2 text-gray-slate hover:text-orange transition-colors focus:outline-none focus:ring-2 focus:ring-orange focus:ring-offset-2 rounded-md"
              aria-label={`Theme: ${general.theme} (press to change)`}
              title={`Current theme: ${general.theme}`}
            >
              {getThemeIcon()}
            </button>

            {/* Global Search - Placeholder */}
            <div className="hidden md:block relative group">
              <input
                type="search"
                placeholder="Search everything..."
                className="w-64 px-4 py-2 pl-10 rounded-md border border-gray-light dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                disabled
                aria-label="Global search (coming soon)"
                aria-disabled="true"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500"
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
              <div className="absolute hidden group-hover:block top-full left-0 mt-2 px-3 py-2 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap z-10" role="tooltip">
                Coming soon
              </div>
            </div>
            
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-8 h-8 bg-orange rounded-full flex items-center justify-center hover:bg-orange-dark transition-colors focus:outline-none focus:ring-2 focus:ring-orange focus:ring-offset-2 overflow-hidden"
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
                  <span className="text-white font-bold text-base" aria-hidden="true">
                    {userInitial}
                  </span>
                )}
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-slate rounded-xl shadow-lg border border-gray-light overflow-hidden" role="menu" aria-labelledby="user-menu-heading">
                  <div className="p-4 border-b border-gray-light">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-orange rounded-full flex items-center justify-center overflow-hidden" aria-hidden="true">
                        {userAvatarUrl ? (
                          <img
                            src={userAvatarUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-white font-bold text-lg">
                            {userInitial}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p id="user-menu-heading" className="text-sm font-medium text-orange-dark dark:text-white truncate">
                          {userName}
                        </p>
                        <p className="text-xs text-gray-slate truncate">
                          {userEmail}
                        </p>
                        {userRole === 'superuser' && (
                          <p className="text-xs font-semibold text-orange truncate">
                            Super User
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="py-2">
                    <Link
                      href="/profile"
                      className="block px-4 py-2 text-sm text-gray-slate hover:bg-gray-light/30 hover:text-orange transition-colors"
                      onClick={() => setIsDropdownOpen(false)}
                      role="menuitem"
                    >
                      Profile
                    </Link>
                    <Link
                      href="/settings"
                      className="block px-4 py-2 text-sm text-gray-slate hover:bg-gray-light/30 hover:text-orange transition-colors"
                      onClick={() => setIsDropdownOpen(false)}
                      role="menuitem"
                    >
                      Settings
                    </Link>
                    <button
                      className="w-full text-left px-4 py-2 text-sm text-gray-slate hover:bg-gray-light/30 hover:text-orange transition-colors"
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
    </header>
  );
}
