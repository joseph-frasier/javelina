'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import CertificateProductSelector from '@/components/certificates/CertificateProductSelector';
import CertificateCheckoutForm from '@/components/certificates/CertificateCheckoutForm';
import type { SslProduct } from '@/types/certificates';

function NewCertificateContent() {
  const searchParams = useSearchParams();
  const initialDomain = searchParams.get('domain') ?? '';

  const [selectedProduct, setSelectedProduct] = useState<SslProduct | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/domains?tab=ssl-certificates"
          className="text-blue-electric hover:underline text-sm flex items-center gap-1"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Certificates
        </Link>
        <span className="text-gray-light dark:text-gray-600">/</span>
        <span className="text-sm text-gray-slate dark:text-gray-400">New</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-orange-dark dark:text-white">
          Purchase SSL Certificate
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {selectedProduct
            ? 'Fill in your details to complete the purchase.'
            : 'Choose a certificate type to get started.'}
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm">
        <div className={`flex items-center gap-1.5 ${!selectedProduct ? 'text-orange font-medium' : 'text-gray-slate dark:text-gray-400'}`}>
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${!selectedProduct ? 'bg-orange text-white' : 'bg-gray-light dark:bg-gray-700 text-gray-slate dark:text-gray-400'}`}>
            1
          </span>
          Select Product
        </div>
        <svg className="w-4 h-4 text-gray-light dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <div className={`flex items-center gap-1.5 ${selectedProduct ? 'text-orange font-medium' : 'text-gray-slate dark:text-gray-400'}`}>
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${selectedProduct ? 'bg-orange text-white' : 'bg-gray-light dark:bg-gray-700 text-gray-slate dark:text-gray-400'}`}>
            2
          </span>
          Checkout
        </div>
      </div>

      {/* Step 1: Product selector */}
      {!selectedProduct && (
        <CertificateProductSelector onSelect={setSelectedProduct} />
      )}

      {/* Step 2: Checkout form */}
      {selectedProduct && (
        <div className="space-y-4">
          {/* Selected product summary + change button */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-orange/5 dark:bg-orange/10 border border-orange/20">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-[0.22em] text-orange">Selected</span>
              <span className="text-sm font-bold text-orange-dark dark:text-white">
                {selectedProduct.display_name}
              </span>
              <span className="text-sm text-gray-slate dark:text-gray-400">
                &mdash; ${selectedProduct.price.toFixed(2)}/yr
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedProduct(null)}
              className="text-sm text-blue-electric hover:underline shrink-0"
            >
              Change
            </button>
          </div>

          <CertificateCheckoutForm
            selectedProduct={selectedProduct}
            initialDomain={initialDomain}
            onBack={() => setSelectedProduct(null)}
          />
        </div>
      )}
    </div>
  );
}

export default function NewCertificatePage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-light dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-6 w-64 bg-gray-light dark:bg-gray-700 rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 bg-gray-light dark:bg-gray-700 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    }>
      <NewCertificateContent />
    </Suspense>
  );
}
