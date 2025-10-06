'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';

export function Header() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-orange rounded-md flex items-center justify-center">
                <span className="text-white font-black text-xl">J</span>
              </div>
              <span className="font-condensed font-semibold text-xl text-orange-dark dark:text-white">
                Javelina
              </span>
            </Link>
          </div>

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

          <div className="flex items-center space-x-4">
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-8 h-8 bg-orange rounded-full flex items-center justify-center hover:bg-orange-dark transition-colors focus:outline-none focus:ring-2 focus:ring-orange focus:ring-offset-2"
              >
                <span className="text-white font-bold text-sm">U</span>
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-slate rounded-xl shadow-lg border border-gray-light overflow-hidden">
                  <div className="p-4 border-b border-gray-light">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-orange rounded-full flex items-center justify-center">
                        <span className="text-white font-bold">U</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-orange-dark dark:text-white truncate">
                          John Doe
                        </p>
                        <p className="text-xs text-gray-slate truncate">
                          john@acme.com
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
