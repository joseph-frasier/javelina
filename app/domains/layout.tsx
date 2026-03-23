'use client';

import { usePathname } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export default function DomainsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isDetailPage = pathname !== '/domains' && pathname.startsWith('/domains/');

  return (
    <ProtectedRoute>
      <div className={`max-w-4xl mx-auto px-4 sm:px-6 lg:px-6 py-4 sm:py-6 md:py-8 ${isDetailPage ? '' : 'space-y-6'}`}>
        {children}
      </div>
    </ProtectedRoute>
  );
}
