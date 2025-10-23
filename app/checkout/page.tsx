'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';
import { StripePaymentForm } from '@/components/stripe/StripePaymentForm';
import { useSubscriptionStore } from '@/lib/subscription-store';
import { useAuthStore } from '@/lib/auth-store';
import { useToastStore } from '@/lib/toast-store';

export default function CheckoutPage() {
  const router = useRouter();
  const { selectedPlan, processPayment, isProcessing } = useSubscriptionStore();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const showToast = useToastStore((state) => state.showToast);

  // Redirect if no plan selected
  useEffect(() => {
    if (!selectedPlan) {
      router.push('/pricing');
    }
  }, [selectedPlan, router]);

  const handlePaymentSubmit = async (paymentDetails: any) => {
    const result = await processPayment(paymentDetails);

    if (result.success) {
      showToast('Payment successful! Welcome to Javelina.', 'success');
      
      // Check if user is authenticated
      if (isAuthenticated) {
        // User is authenticated, go to dashboard
        setTimeout(() => {
          router.push('/');
        }, 1000);
      } else {
        // User needs to login/verify email first
        setTimeout(() => {
          showToast('Please login to access your dashboard', 'info');
          router.push('/login');
        }, 1500);
      }
    } else {
      showToast(result.error || 'Payment failed. Please try again.', 'error');
    }
  };

  if (!selectedPlan) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-orange-light">
      {/* Header */}
      <div className="border-b border-gray-light bg-white">
        <div className="max-w-7xl mx-auto pl-2 pr-4 sm:pl-3 sm:pr-6 lg:pl-4 lg:pr-8 py-1 flex items-center justify-between">
          <Logo width={150} height={60} />
          <Link
            href="/pricing"
            className="inline-flex items-center text-orange hover:underline font-regular"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to pricing
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-orange-dark mb-2">
            Complete Your Purchase
          </h1>
          <p className="text-base text-gray-slate font-light">
            You&apos;re one step away from unlocking powerful DNS management
          </p>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Payment Form - 2 columns */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-gray-light shadow-lg p-8">
              <h2 className="text-2xl font-bold text-orange-dark mb-6">
                Payment Details
              </h2>
              <StripePaymentForm
                onSubmit={handlePaymentSubmit}
                isProcessing={isProcessing}
              />
            </div>
          </div>

          {/* Order Summary - 1 column */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-light shadow-lg p-8 sticky top-8">
              <h2 className="text-xl font-bold text-orange-dark mb-6">
                Order Summary
              </h2>

              <div className="space-y-6">
                {/* Plan Details */}
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-orange-dark">
                        {selectedPlan.name} Plan
                      </h3>
                      <p className="text-sm text-gray-slate font-light">
                        Billed {selectedPlan.interval}ly
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-orange-dark">
                        ${selectedPlan.price}
                      </p>
                      <p className="text-sm text-gray-slate font-light">
                        /{selectedPlan.interval}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-light pt-4">
                  <p className="text-sm text-gray-slate font-light mb-3">
                    What&apos;s included:
                  </p>
                  <div className="space-y-2">
                    {selectedPlan.features.slice(0, 5).map((feature, index) => (
                      <div key={index} className="flex items-start">
                        <svg
                          className="w-4 h-4 text-orange mr-2 flex-shrink-0 mt-0.5"
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
                        <span className="text-sm text-gray-slate font-regular">
                          {feature}
                        </span>
                      </div>
                    ))}
                    {selectedPlan.features.length > 5 && (
                      <p className="text-sm text-gray-slate font-light italic pl-6">
                        + {selectedPlan.features.length - 5} more features
                      </p>
                    )}
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-light"></div>

                {/* Total */}
                <div className="flex justify-between items-center pt-2">
                  <span className="text-lg font-bold text-orange-dark">
                    Total due today
                  </span>
                  <span className="text-2xl font-black text-orange-dark">
                    ${selectedPlan.price}
                  </span>
                </div>

                {/* Fine Print */}
                <div className="pt-4 border-t border-gray-light">
                  <p className="text-xs text-gray-slate font-light">
                    Your subscription will automatically renew every{' '}
                    {selectedPlan.interval}. You can cancel anytime from your
                    account settings.
                  </p>
                </div>

                {/* Money Back Guarantee */}
                <div className="flex items-start space-x-2 p-3 bg-orange-light rounded-lg">
                  <svg
                    className="w-5 h-5 text-orange flex-shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                  <div className="text-sm text-gray-slate font-regular">
                    <p className="font-bold text-orange-dark mb-1">
                      14-Day Money-Back Guarantee
                    </p>
                    <p className="font-light">
                      Not satisfied? Get a full refund within 14 days.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

