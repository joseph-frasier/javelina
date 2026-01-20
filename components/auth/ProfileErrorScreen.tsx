'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import Button from '@/components/ui/Button';

interface ProfileErrorScreenProps {
  error: string;
}

export function ProfileErrorScreen({ error }: ProfileErrorScreenProps) {
  const router = useRouter();
  const { logout } = useAuthStore();

  const handleSignOut = async () => {
    await logout();
    
    // Small delay to ensure session is fully cleared before redirect
    // This prevents middleware from seeing stale authenticated session
    await new Promise(resolve => setTimeout(resolve, 100));
    
    router.push('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-orange-light px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-light p-8">
        <div className="text-center">
          {/* Error Icon */}
          <div className="mb-6">
            <svg
              className="w-16 h-16 mx-auto text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          {/* Heading */}
          <h1 className="text-2xl font-bold text-orange-dark dark:text-white mb-3">
            Profile Loading Failed
          </h1>

          {/* Error Message */}
          <p className="text-gray-slate dark:text-gray-300 mb-6 leading-relaxed">
            {error}
          </p>

          {/* Error Details (smaller text) */}
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
            This usually happens due to a network issue or if your profile data is unavailable. 
            Please sign out and try again.
          </p>

          {/* Sign Out Button */}
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={handleSignOut}
          >
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}

