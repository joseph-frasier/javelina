'use client';

import { useState, useEffect } from 'react';
import { certificatesApi } from '@/lib/api-client';
import type { SslProduct } from '@/types/certificates';

interface CertificateProductSelectorProps {
  onSelect: (product: SslProduct) => void;
}

type ValidationLevel = 'dv' | 'ov' | 'ev';

const LEVEL_LABELS: Record<ValidationLevel, string> = {
  dv: 'Domain Validated',
  ov: 'Organization Validated',
  ev: 'Extended Validation',
};

const LEVEL_BADGE_CLASSES: Record<ValidationLevel, string> = {
  dv: 'bg-blue-electric/10 text-blue-electric border border-blue-electric/20',
  ov: 'bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-700',
  ev: 'bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-700',
};

const LEVEL_DESCRIPTIONS: Record<ValidationLevel, string> = {
  dv: 'Validates domain ownership only. Issued in minutes. Great for blogs, personal sites, and basic encryption.',
  ov: 'Validates organization identity. Shows company name in certificate. Best for business websites.',
  ev: 'Highest validation level. Thorough vetting of business identity. Recommended for e-commerce and financial sites.',
};

export default function CertificateProductSelector({ onSelect }: CertificateProductSelectorProps) {
  const [products, setProducts] = useState<SslProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ValidationLevel>('dv');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await certificatesApi.listProducts();
        setProducts(data.products);
        // Default to the first available level
        const levels: ValidationLevel[] = ['dv', 'ov', 'ev'];
        const firstAvailable = levels.find((l) =>
          data.products.some((p) => p.validation_level === l)
        );
        if (firstAvailable) setActiveTab(firstAvailable);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load products';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const levels: ValidationLevel[] = ['dv', 'ov', 'ev'];
  const availableLevels = levels.filter((l) => products.some((p) => p.validation_level === l));
  const visibleProducts = products.filter((p) => p.validation_level === activeTab);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Tab skeleton */}
        <div className="flex gap-2 border-b border-border pb-0">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 w-32 bg-surface-alt dark:bg-gray-700 rounded-t-md animate-pulse" />
          ))}
        </div>
        {/* Card skeletons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-border bg-surface p-5 animate-pulse"
            >
              <div className="h-4 w-20 bg-surface-alt dark:bg-gray-700 rounded mb-3" />
              <div className="h-6 w-40 bg-surface-alt dark:bg-gray-700 rounded mb-2" />
              <div className="h-4 w-24 bg-surface-alt dark:bg-gray-700 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
        <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        <button
          className="mt-2 text-sm text-blue-electric hover:underline"
          onClick={() => {
            setError(null);
            setIsLoading(true);
            certificatesApi
              .listProducts()
              .then((d) => setProducts(d.products))
              .catch((err: unknown) => {
                const message = err instanceof Error ? err.message : 'Failed to load products';
                setError(message);
              })
              .finally(() => setIsLoading(false));
          }}
        >
          Try again
        </button>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="p-4 rounded-lg bg-accent/5 border border-accent/20 text-center">
        <p className="text-sm text-text-muted">No certificate products available at this time.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 border-b border-border mb-6">
        {availableLevels.map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => setActiveTab(level)}
            className={
              activeTab === level
                ? 'px-4 py-2.5 text-sm font-medium border-b-2 border-accent text-accent -mb-px transition-colors'
                : 'px-4 py-2.5 text-sm font-medium border-b-2 border-transparent text-text-muted hover:text-text dark:hover:text-gray-200 -mb-px transition-colors'
            }
          >
            {LEVEL_LABELS[level]}
          </button>
        ))}
      </div>

      {/* Level description */}
      <p className="text-sm text-text-muted mb-4">
        {LEVEL_DESCRIPTIONS[activeTab]}
      </p>

      {/* Product grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleProducts.map((product) => (
          <button
            key={product.product_type}
            type="button"
            onClick={() => onSelect(product)}
            className="text-left rounded-xl border border-border bg-surface p-5 hover:border-accent hover:shadow-md transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 group"
          >
            {/* Badges row */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${LEVEL_BADGE_CLASSES[product.validation_level]}`}
              >
                {product.validation_level.toUpperCase()}
              </span>
              {product.wildcard && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-accent/10 text-accent border border-accent/20">
                  Wildcard
                </span>
              )}
              {product.san && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-surface-alt dark:bg-gray-700 text-text-muted border border-border">
                  SAN
                </span>
              )}
            </div>

            {/* Product name */}
            <p className="font-bold text-text text-base mb-1 group-hover:text-accent transition-colors">
              {product.display_name}
            </p>

            {/* Validation level label */}
            <p className="text-xs text-text-muted mb-3">
              {LEVEL_LABELS[product.validation_level]}
            </p>

            {/* Price */}
            <div className="flex items-baseline gap-1">
              {product.price === 0 ? (
                <span className="text-xl font-black text-green-500">Free</span>
              ) : (
                <>
                  <span className="text-xl font-black text-accent">
                    ${product.price.toFixed(2)}
                  </span>
                  <span className="text-xs text-text-muted">/yr</span>
                </>
              )}
            </div>

            {/* CTA hint */}
            <p className="mt-3 text-xs font-medium text-accent opacity-0 group-hover:opacity-100 transition-opacity">
              Select &rarr;
            </p>
          </button>
        ))}
      </div>

      {/* Additional products note */}
      <p className="text-xs text-text-muted mt-6 text-center">
        Need a different certificate? Additional SSL products are available upon request.{' '}
        <a href="mailto:support@javelina.cc" className="text-accent hover:underline">Contact us</a>
      </p>
    </div>
  );
}
