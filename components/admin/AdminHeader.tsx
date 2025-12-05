'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getAdminUser, logoutAdmin } from '@/lib/admin-auth';
import { useSettingsStore } from '@/lib/settings-store';
import { Logo } from '@/components/ui/Logo';

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
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchAdmin = async () => {
      const user = await getAdminUser();
      setAdmin(user);
      setLoading(false);
    };
    fetchAdmin();
  }, []);

  const handleLogout = async () => {
    await logoutAdmin();
    router.push('/admin/login');
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

  // Close dropdown when clicking outside
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
    }

    if (isDropdownOpen || isNotificationOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen, isNotificationOpen]);

  const adminName = admin?.name || 'Admin User';
  const adminEmail = admin?.email || '';
  const adminInitial = adminName.charAt(0).toUpperCase();

  return (
    <header className="bg-white border-b border-gray-light">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            {/* Hamburger Menu Button - Mobile Only */}
            <button
              onClick={onMenuToggle}
              className="md:hidden p-2 rounded-md text-gray-slate hover:text-orange hover:bg-gray-light/30 transition-colors"
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
            <nav className="hidden md:flex items-center space-x-6">
              <Link
                href="/admin"
                className="text-gray-slate hover:text-orange font-regular text-sm transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/admin/users"
                className="text-gray-slate hover:text-orange font-regular text-sm transition-colors"
              >
                Users
              </Link>
              <Link
                href="/admin/organizations"
                className="text-gray-slate hover:text-orange font-regular text-sm transition-colors"
              >
                Organizations
              </Link>
            </nav>

            {/* Notifications */}
            <div className="relative" ref={notificationRef}>
              <button 
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className="p-2 text-gray-slate hover:text-orange transition-colors focus:outline-none"
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
                <div className="fixed sm:absolute right-2 sm:right-0 left-2 sm:left-auto mt-2 sm:w-80 bg-white dark:bg-gray-slate rounded-xl shadow-lg border border-gray-light overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="p-4 border-b border-gray-light flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-orange-dark dark:text-orange">Notifications</h3>
                    <button className="text-xs text-orange hover:text-orange-dark transition-colors font-medium">
                      Clear All
                    </button>
                  </div>
                  <div className="p-8 text-center">
                    <p className="text-sm text-gray-slate dark:text-gray-300">No new notifications</p>
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
                title="Global search coming soon"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <div className="absolute hidden group-hover:block top-full left-0 mt-2 px-3 py-2 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap z-10">
                Coming soon
              </div>
            </div>

            {/* User Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-8 h-8 bg-orange rounded-full flex items-center justify-center hover:bg-orange-dark transition-colors focus:outline-none focus:ring-2 focus:ring-orange focus:ring-offset-2"
              >
                <span className="text-white font-bold text-base">
                  {adminInitial}
                </span>
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-light overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="p-4 border-b border-gray-light">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-orange rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-lg">
                          {adminInitial}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-orange-dark truncate">
                          {adminName}
                        </p>
                        <p className="text-xs text-gray-slate truncate">
                          {adminEmail}
                        </p>
                        <p className="text-xs font-semibold text-orange truncate">
                          Administrator
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="py-2">
                    <button
                      className="w-full text-left px-4 py-2 text-sm text-gray-slate hover:bg-gray-light/30 hover:text-orange transition-colors"
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
    </header>
  );
}
