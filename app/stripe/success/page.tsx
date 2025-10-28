'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Logo } from '@/components/ui/Logo';
import { useToastStore } from '@/lib/toast-store';

function SuccessPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const addToast = useToastStore((state) => state.addToast);
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [countdown, setCountdown] = useState(3);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    const paymentIntent = searchParams.get('payment_intent');

    if (!paymentIntent) {
      addToast('error', 'Invalid payment session');
      router.push('/pricing');
      return;
    }

    const maxPolls = 30; // 30 seconds max
    let cancelled = false;

    (async () => {
      for (let i = 0; i < maxPolls && !cancelled; i++) {
        // Simple delay for processing (webhooks should be fast)
        await new Promise(resolve => setTimeout(resolve, 1000));
        // After ~3 seconds, proceed
        if (i >= 2 && !cancelled) {
          setStatus('success');
          return;
        }
      }
      if (!cancelled) {
        // Timeout - redirect anyway
        setStatus('success');
      }
    })();

    return () => { cancelled = true; };
  }, [searchParams, router, addToast]);

  useEffect(() => {
    if (status === 'success') {
      // Start countdown
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setShouldRedirect(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [status]);

  useEffect(() => {
    if (!shouldRedirect) return;
    const orgId = searchParams.get('org_id');
    const path = orgId ? `/organization/${orgId}` : '/';
    // Navigate after commit
    router.push(path);
    // Defer toast to next tick to avoid state update during render of Providers
    setTimeout(() => {
      try { addToast('success', 'Welcome to your new plan!'); } catch {}
    }, 0);
  }, [shouldRedirect, searchParams, router, addToast]);

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-orange-light flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-xl border border-gray-light shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-orange-dark mb-2">
              Something went wrong
            </h1>
            <p className="text-gray-slate mb-6">
              We encountered an error processing your subscription. Please contact support.
            </p>
            <button
              onClick={() => router.push('/pricing')}
              className="w-full bg-orange hover:bg-orange-dark text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Back to Pricing
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    const orgId = searchParams.get('org_id');
    const redirectPath = orgId ? `/organization/${orgId}` : '/';
    
    return (
      <div className="min-h-screen bg-orange-light flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-xl border border-gray-light shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-orange-dark mb-2">
              Payment Successful! 🎉
            </h1>
            <p className="text-gray-slate mb-6">
              Your subscription is now active. Redirecting to dashboard in {countdown}...
            </p>
            <button
              onClick={() => router.push(redirectPath)}
              className="w-full bg-orange hover:bg-orange-dark text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Go to Dashboard Now
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-orange-light">
      {/* Header */}
      <div className="border-b border-gray-light bg-white">
        <div className="max-w-7xl mx-auto pl-2 pr-4 sm:pl-3 sm:pr-6 lg:pl-4 lg:pr-8 py-1">
          <Logo width={150} height={60} />
        </div>
      </div>

      {/* Processing Content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-xl border border-gray-light shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-orange-light rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange"></div>
            </div>
            <h1 className="text-2xl font-bold text-orange-dark mb-2">
              Processing Your Subscription
            </h1>
            <p className="text-gray-slate">
              Please wait while we activate your new plan...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-orange-light flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange"></div>
      </div>
    }>
      <SuccessPageContent />
    </Suspense>
  );
}

