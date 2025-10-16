'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAdminSession } from '@/lib/admin-auth';

export function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const session = await getAdminSession();
      if (!session) {
        router.push('/admin/login');
      } else {
        setIsAuthorized(true);
      }
      setLoading(false);
    };
    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-dark mx-auto mb-4"></div>
          <p className="text-gray-slate">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return isAuthorized ? <>{children}</> : null;
}
