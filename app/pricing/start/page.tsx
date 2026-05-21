import { Suspense } from 'react';
import type { Metadata } from 'next';
import PricingStartContent from './PricingStartContent';

export const metadata: Metadata = {
  title: 'Choose Your Plan Type | Javelina',
  description:
    'Pick the right Javelina product for you: self-serve DNS for developers, or fully-managed Business Services for teams who want everything done for them.',
};

export default function PricingStartPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-orange-light">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange"></div>
            <span className="text-orange-dark">Loading...</span>
          </div>
        </div>
      }
    >
      <PricingStartContent />
    </Suspense>
  );
}
