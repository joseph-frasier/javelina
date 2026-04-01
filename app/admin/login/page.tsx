'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function AdminLoginPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'checking' | 'not-logged-in' | 'not-admin'>('checking');

  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        const response = await fetch('/api/backend/admin/me', {
          credentials: 'include',
        });

        if (response.ok) {
          router.push('/admin');
          return;
        }

        if (response.status === 403) {
          setStatus('not-admin');
          return;
        }

        setStatus('not-logged-in');
      } catch {
        setStatus('not-logged-in');
      }
    };

    checkAdminAccess();
  }, [router]);

  const handleLogin = () => {
    window.location.href = `${API_URL}/auth/login`;
  };

  if (status === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-dark mx-auto mb-4"></div>
          <p style={{ color: 'var(--text-secondary)' }}>Checking admin access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--background)' }}>
      <div className="rounded-lg shadow-lg max-w-md w-full p-8" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-orange rounded-lg flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-center mb-2" style={{ color: 'var(--orange-dark)' }}>
          Admin Panel
        </h1>
        <p className="text-center mb-8" style={{ color: 'var(--text-secondary)' }}>
          Irongrove DNS Administration
        </p>

        {status === 'not-admin' && (
          <div className="mb-6 p-4 rounded-lg" style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderColor: '#ef4444',
            borderWidth: '1px',
          }}>
            <p className="text-sm" style={{ color: '#ef4444' }}>
              Access denied. Your account does not have SuperAdmin privileges.
            </p>
          </div>
        )}

        {status === 'not-logged-in' && (
          <div className="mb-6 p-4 rounded-lg" style={{
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderColor: '#3b82f6',
            borderWidth: '1px',
          }}>
            <p className="text-sm" style={{ color: '#3b82f6' }}>
              Please sign in with your account to access the admin panel.
            </p>
          </div>
        )}

        <Button
          variant="primary"
          className="w-full"
          onClick={handleLogin}
        >
          {status === 'not-admin' ? 'Sign In with a Different Account' : 'Sign In'}
        </Button>

        <div className="mt-8 pt-8">
          <p className="text-xs text-center" style={{ color: 'var(--text-secondary)' }}>
            Authorized personnel only. All access is logged.
          </p>
        </div>
      </div>
    </div>
  );
}
