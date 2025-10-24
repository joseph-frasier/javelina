'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/ui/Logo';
import Button from '@/components/ui/Button';
import { useAuthStore } from '@/lib/auth-store';

export default function EmailVerifiedPage() {
  const router = useRouter();
  const { isAuthenticated, user, initializeAuth } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  // Check authentication status when page loads
  useEffect(() => {
    const checkAuth = async () => {
      await initializeAuth();
      setIsChecking(false);
    };
    checkAuth();
  }, [initializeAuth]);

  // If user is authenticated, auto-redirect to pricing
  useEffect(() => {
    if (!isChecking && isAuthenticated && user) {
      console.log('[Email Verified] User is authenticated, redirecting to pricing');
      
      // Check if user has organizations
      const hasOrganizations = user.organizations && user.organizations.length > 0;
      
      if (hasOrganizations) {
        // User already has organizations, go to dashboard
        router.push('/');
      } else {
        // First-time user, go to pricing
        router.push('/pricing?onboarding=true');
      }
    }
  }, [isAuthenticated, user, router, isChecking]);

  // Show loading state while checking
  if (isChecking) {
    return (
      <div className="min-h-screen bg-orange-light flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[520px]">
          <div className="flex flex-col items-center mb-8">
            <Logo width={300} height={120} priority />
          </div>
          <div className="bg-white rounded-xl shadow-lg border border-gray-light p-8">
            <div className="text-center">
              <div className="mb-6">
                <svg
                  className="animate-spin w-20 h-20 mx-auto text-orange"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-orange-dark mb-3">
                Verifying your email...
              </h1>
              <p className="text-gray-slate">Please wait while we complete your verification.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show success message if not authenticated (rare case - user should be auto-redirected)
  return (
    <div className="min-h-screen bg-orange-light flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-[520px]">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <Logo width={300} height={120} priority />
        </div>

        {/* Success Card */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-light p-8">
          <div className="text-center">
            {/* Success Icon */}
            <div className="mb-6">
              <svg
                className="w-20 h-20 mx-auto text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>

            {/* Heading */}
            <h1 className="text-3xl font-bold text-orange-dark mb-3">
              Email Verified!
            </h1>

            {/* Message */}
            <p className="text-gray-slate mb-6 leading-relaxed">
              Your email has been successfully verified. Click below to continue to your dashboard.
            </p>

            {/* Sign In Button */}
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={() => router.push('/login')}
            >
              Continue to Dashboard
            </Button>
          </div>
        </div>

        {/* Footer Note */}
        <p className="mt-6 text-center text-sm text-gray-slate">
          You can close this tab if you prefer, or click the button above to continue.
        </p>
      </div>
    </div>
  );
}

