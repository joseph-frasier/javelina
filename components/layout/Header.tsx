'use client';

import Link from 'next/link';

export function Header() {
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
            <Link
              href="/settings"
              className="text-gray-slate hover:text-orange font-regular text-sm transition-colors"
            >
              Settings
            </Link>
          </nav>

          <div className="flex items-center space-x-4">
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
            <div className="w-8 h-8 bg-orange rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">U</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
