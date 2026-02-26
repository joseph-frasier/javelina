'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/ui/Logo';
import Button from '@/components/ui/Button';
import { useAuthStore } from '@/lib/auth-store';
import { authApi } from '@/lib/api-client';
import { useToastStore } from '@/lib/toast-store';

// Session storage key to track if we've already processed verification
const VERIFICATION_PROCESSED_KEY = 'email_verification_processed';

export default function EmailVerifiedPage() {
  const router = useRouter();
  const { isAuthenticated, initializeAuth, fetchProfile } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);
  const [hasProcessed, setHasProcessed] = useState(false);
  const addToast = useToastStore((state) => state.addToast);

  // Check authentication status and refresh verification status when page loads
  useEffect(() => {
    // CRITICAL: Check and set flag IMMEDIATELY (synchronously) to prevent race conditions
    const alreadyProcessed = sessionStorage.getItem(VERIFICATION_PROCESSED_KEY);
    
    if (alreadyProcessed) {
      console.log('[EMAIL-VERIFIED] Already processed in this session, redirecting...');
      setIsChecking(false);
      setHasProcessed(true);
      router.push('/');
      return;
    }

    // Set flag IMMEDIATELY before any async operations
    // This prevents React Strict Mode's double-mount from causing duplicates
    sessionStorage.setItem(VERIFICATION_PROCESSED_KEY, 'true');
    console.log('[EMAIL-VERIFIED] Flag set, starting verification check...');

    const checkAuthAndRefreshStatus = async () => {
      try {
        // First, initialize auth to check if user is logged in
        await initializeAuth();

        // If user is authenticated, force a refresh of their verification status from Auth0
        if (useAuthStore.getState().isAuthenticated) {
          console.log('[EMAIL-VERIFIED] User authenticated, refreshing verification status from Auth0...');
          
          // Wait a moment for Auth0's backend to fully process the verification
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Call the new backend endpoint that fetches status from Auth0 and updates session
          const result = await authApi.refreshVerificationStatus();
          
          console.log('[EMAIL-VERIFIED] Refresh result:', result);
          
          setHasProcessed(true);
          
          if (result.email_verified) {
            // If user arrived via invitation flow, attempt membership finalization.
            // Non-invitation users can safely ignore this response.
            try {
              await authApi.finalizeInvitation();
            } catch (finalizeError: any) {
              const code = finalizeError?.code || finalizeError?.details?.code;
              const statusCode = finalizeError?.statusCode;
              // Ignore expected non-fatal states so normal email verification flow continues.
              if (
                code !== 'NO_PENDING_INVITATION' &&
                code !== 'INVITATION_NOT_READY' &&
                statusCode !== 404
              ) {
                console.warn('[EMAIL-VERIFIED] Invitation finalization issue:', finalizeError);
              }
            }

            // Fetch fresh profile to update the UI
            await fetchProfile();
            
            addToast('success', 'Email verified successfully!');
            // Redirect to dashboard after a brief moment
            setTimeout(() => {
              // Clear the flag after redirect so user can verify again if needed
              sessionStorage.removeItem(VERIFICATION_PROCESSED_KEY);
              router.push('/');
            }, 800);
          } else {
            // Auth0 says email is still not verified
            addToast('warning', 'Email verification is still pending. Please check your inbox or try again.');
            setTimeout(() => {
              sessionStorage.removeItem(VERIFICATION_PROCESSED_KEY);
              router.push('/');
            }, 2000);
          }
        } else {
          // Not authenticated - redirect to login
          addToast('info', 'Please log in to continue.');
          setTimeout(() => {
            sessionStorage.removeItem(VERIFICATION_PROCESSED_KEY);
            router.push('/login');
          }, 1000);
        }
      } catch (error) {
        console.error('[EMAIL-VERIFIED] Error during verification check:', error);
        addToast('error', 'Failed to verify email status. Redirecting to dashboard...');
        setTimeout(() => {
          sessionStorage.removeItem(VERIFICATION_PROCESSED_KEY);
          router.push('/');
        }, 2000);
      } finally {
        setIsChecking(false);
      }
    };

    checkAuthAndRefreshStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run once on mount

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
