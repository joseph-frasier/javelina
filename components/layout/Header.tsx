'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useRef, useEffect } from 'react';

export function Header() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // User details hard coded for now. update to handle state when login is implemented
  const userName = 'John Doe';
  const userEmail = 'john@acme.com';
  const userInitial = userName.charAt(0).toUpperCase();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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
    <header className="bg-white dark:bg-orange-dark border-b border-gray-light sticky top-0 z-50">
      <div className="max-w-7xl mx-auto pr-4 sm:pr-6 lg:pr-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <Image
                src="/JAVELINA LOGO TRANSPARENT BACKGROUND.png"
                alt="Javelina - Take control of your DNS"
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
            <button className="p-2 text-gray-slate hover:text-orange transition-colors">
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
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-8 h-8 bg-orange rounded-full flex items-center justify-center hover:bg-orange-dark transition-colors focus:outline-none focus:ring-2 focus:ring-orange focus:ring-offset-2"
              >
                <span className="text-white font-bold text-sm">{userInitial}</span>
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-slate rounded-xl shadow-lg border border-gray-light overflow-hidden">
                  <div className="p-4 border-b border-gray-light">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-orange rounded-full flex items-center justify-center">
                        <span className="text-white font-bold">{userInitial}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-orange-dark dark:text-white truncate">
                          {userName}
                        </p>
                        <p className="text-xs text-gray-slate truncate">
                          {userEmail}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="py-2">
                    <Link
                      href="/profile"
                      className="block px-4 py-2 text-sm text-gray-slate hover:bg-gray-light hover:text-orange transition-colors"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      Profile
                    </Link>
                    <Link
                      href="/settings"
                      className="block px-4 py-2 text-sm text-gray-slate hover:bg-gray-light hover:text-orange transition-colors"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      Settings
                    </Link>
                    <button
                      className="w-full text-left px-4 py-2 text-sm text-gray-slate hover:bg-gray-light hover:text-orange transition-colors"
                      onClick={() => {
                        setIsDropdownOpen(false);
                        // Add logout logic here
                      }}
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
