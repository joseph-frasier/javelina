'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToastStore } from '@/lib/toast-store';

function SuccessPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const addToast = useToastStore((state) => state.addToast);
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [countdown, setCountdown] = useState(3);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  const orgId = searchParams.get('org_id');
  const intake = searchParams.get('intake');
  const planCode = searchParams.get('plan_code');
  const orgName = searchParams.get('org_name');

  function resolveDestination(): string {
    if (intake === 'business' && orgId && planCode) {
      const qs = new URLSearchParams({ org_id: orgId, plan_code: planCode });
      if (orgName) qs.set('org_name', orgName);
      return `/business/setup?${qs.toString()}`;
    }
    return orgId ? `/organization/${orgId}` : '/';
  }

  useEffect(() => {
    const paymentIntent = searchParams.get('payment_intent');
    const setupIntent = searchParams.get('setup_intent');

    // Accept either payment_intent (normal payment) or setup_intent ($0 first invoice due to discount)
    if (!paymentIntent && !setupIntent) {
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
    // Navigate after commit
    router.push(resolveDestination());
    // Defer toast to next tick to avoid state update during render of Providers
    setTimeout(() => {
      try {
        addToast('success', intake === 'business'
          ? 'Welcome to Javelina Business. Let\'s set up your site.'
          : 'Welcome to your new plan!');
      } catch {}
    }, 0);
  }, [shouldRedirect, searchParams, router, addToast]); // eslint-disable-line react-hooks/exhaustive-deps

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-surface rounded-xl border border-border shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-red-600 dark:text-red-400"
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
            <h1 className="text-2xl font-bold text-text mb-2">
              Something went wrong
            </h1>
            <p className="text-text-muted mb-6">
              We encountered an error processing your subscription. Please contact support.
            </p>
            <button
              onClick={() => router.push('/pricing')}
              className="w-full bg-accent hover:bg-accent-hover text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Back to Pricing
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    const redirectPath = resolveDestination();
    
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-surface rounded-xl border border-border shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-green-600 dark:text-green-400"
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
            <h1 className="text-2xl font-bold text-text mb-2">
              Payment Successful!
            </h1>
            <p className="text-text-muted mb-6">
              {intake === 'business'
                ? `Your subscription is now active. Redirecting to setup in ${countdown}...`
                : `Your subscription is now active. Redirecting to dashboard in ${countdown}...`}
            </p>
            <button
              onClick={() => router.push(redirectPath)}
              className="w-full bg-accent hover:bg-accent-hover text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              {intake === 'business' ? 'Set Up My Site Now' : 'Go to Dashboard Now'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Processing Content */}
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="max-w-md w-full">
          <div className="bg-surface rounded-xl border border-border shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-accent-light dark:bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-accent"></div>
            </div>
            <h1 className="text-2xl font-bold text-text mb-2">
              Processing Your Subscription
            </h1>
            <p className="text-text-muted">
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-accent"></div>
      </div>
    }>
      <SuccessPageContent />
    </Suspense>
  );
}

