'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

const TABS = [
  { href: '/domains', label: 'Register Domains' },
  { href: '/domains/transfer', label: 'Transfer Domain' },
  { href: '/domains/my-domains', label: 'My Domains' },
] as const;

export default function DomainsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const success = searchParams.get('success');
  const cancelled = searchParams.get('cancelled');

  return (
    <ProtectedRoute>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-orange-dark dark:text-white">
            Domains
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Search, register, and manage your domain names.
          </p>
        </div>

        {success === 'true' && (
          <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <p className="text-sm text-green-700 dark:text-green-400 font-medium">
              Payment successful! Your domain is being processed. This may take a few moments.
            </p>
          </div>
        )}
        {cancelled === 'true' && (
          <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm text-yellow-700 dark:text-yellow-400 font-medium">
              Checkout was cancelled. You can try again anytime.
            </p>
          </div>
        )}

        <nav className="flex gap-6 border-b border-gray-light dark:border-gray-700">
          {TABS.map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`pb-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-orange-dark dark:text-orange border-b-2 border-orange'
                    : 'text-gray-slate dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100'
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        {children}
      </div>
    </ProtectedRoute>
  );
}
