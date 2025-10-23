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
}

export function Header({ onMenuToggle }: HeaderProps = {}) {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { general, setTheme } = useSettingsStore();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

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
    const themes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(general.theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    const nextTheme = themes[nextIndex];
    setTheme(nextTheme);
  };

  const getThemeIcon = () => {
    switch (general.theme) {
      case 'light':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        );
      case 'dark':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        );
      case 'system':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        );
    }
  };

  // Apply theme on mount and when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const resolved = general.theme === 'system'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : general.theme;
      
      document.documentElement.classList.remove('theme-light', 'theme-dark');
      document.documentElement.classList.add(`theme-${resolved}`);
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
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  return (
    <header className="bg-white dark:bg-orange-dark border-b border-gray-light sticky top-0 z-50 [&]:!border-b-gray-light dark:[&]:!border-b-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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

            <Link href="/" className="flex items-center">
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
                href="/"
                className="text-gray-slate hover:text-orange font-regular text-sm transition-colors"
              >
                Dashboard
              </Link>
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
                <div className="absolute left-2 right-2 sm:left-auto sm:right-0 mt-2 sm:w-80 bg-white dark:bg-gray-slate rounded-xl shadow-lg border border-gray-light overflow-hidden z-50">
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
            
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-8 h-8 bg-orange rounded-full flex items-center justify-center hover:bg-orange-dark transition-colors focus:outline-none focus:ring-2 focus:ring-orange focus:ring-offset-2 overflow-hidden"
              >
                {userAvatarUrl ? (
                  <img
                    src={userAvatarUrl}
                    alt="User avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white font-bold text-base">
                    {userInitial}
                  </span>
                )}
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-slate rounded-xl shadow-lg border border-gray-light overflow-hidden">
                  <div className="p-4 border-b border-gray-light">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-orange rounded-full flex items-center justify-center overflow-hidden">
                        {userAvatarUrl ? (
                          <img
                            src={userAvatarUrl}
                            alt="User avatar"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-white font-bold text-lg">
                            {userInitial}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-orange-dark dark:text-white truncate">
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
                    >
                      Profile
                    </Link>
                    <Link
                      href="/settings"
                      className="block px-4 py-2 text-sm text-gray-slate hover:bg-gray-light/30 hover:text-orange transition-colors"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      Settings
                    </Link>
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
