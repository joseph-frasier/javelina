'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export default function CertificatesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-6 py-4 sm:py-6 md:py-8">
        {children}
      </div>
    </ProtectedRoute>
  );
}
