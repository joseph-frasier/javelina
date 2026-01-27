'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Legacy login route - redirects to root page
 * The root page now handles both login (unauthenticated) and dashboard (authenticated) views
 */
export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-orange-light">
      <div className="flex items-center space-x-2">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange"></div>
        <span className="text-orange-dark">Redirecting...</span>
      </div>
    </div>
  );
}
