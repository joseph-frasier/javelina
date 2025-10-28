'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

function ProtectedRouteContent({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading } = useAuthStore();
  
  // Check if user just completed payment
  const paymentComplete = searchParams.get('payment_complete') === 'true';

  useEffect(() => {
    // Allow access if authenticated OR if they just completed payment
    if (!isLoading && !isAuthenticated && !paymentComplete) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, paymentComplete, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-orange-light">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange"></div>
          <span className="text-orange-dark">Loading...</span>
        </div>
      </div>
    );
  }

  // Show content if authenticated OR if payment just completed
  if (!isAuthenticated && !paymentComplete) {
    return null;
  }

  return <>{children}</>;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-orange-light">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange"></div>
          <span className="text-orange-dark">Loading...</span>
        </div>
      </div>
    }>
      <ProtectedRouteContent>{children}</ProtectedRouteContent>
    </Suspense>
  );
}
