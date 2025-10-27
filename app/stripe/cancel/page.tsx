'use client';

import { useRouter } from 'next/navigation';
import { Logo } from '@/components/ui/Logo';
import Button from '@/components/ui/Button';

export default function CancelPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-orange-light">
      {/* Header */}
      <div className="border-b border-gray-light bg-white">
        <div className="max-w-7xl mx-auto pl-2 pr-4 sm:pl-3 sm:pr-6 lg:pl-4 lg:pr-8 py-1">
          <Logo width={150} height={60} />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-xl border border-gray-light shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-gray-slate"
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
              Payment Canceled
            </h1>
            
            <p className="text-gray-slate mb-6">
              Your payment was canceled. No charges have been made to your account.
            </p>

            <div className="space-y-3">
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={() => router.push('/pricing')}
              >
                Back to Pricing
              </Button>
              
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={() => router.push('/')}
              >
                Go to Dashboard
              </Button>
            </div>

            <div className="mt-6 p-4 bg-orange-light rounded-lg">
              <p className="text-sm text-gray-slate">
                <strong className="text-orange-dark">Need help?</strong>
                <br />
                Contact our support team if you have any questions about our plans.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

