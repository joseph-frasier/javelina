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
        <div className="flex gap-2 border-b border-gray-light dark:border-gray-600 pb-0">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 w-32 bg-gray-light dark:bg-gray-700 rounded-t-md animate-pulse" />
          ))}
        </div>
        {/* Card skeletons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-gray-light dark:border-gray-600 bg-white dark:bg-gray-800 p-5 animate-pulse"
            >
              <div className="h-4 w-20 bg-gray-light dark:bg-gray-700 rounded mb-3" />
              <div className="h-6 w-40 bg-gray-light dark:bg-gray-700 rounded mb-2" />
              <div className="h-4 w-24 bg-gray-light dark:bg-gray-700 rounded" />
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
      <div className="p-4 rounded-lg bg-orange/5 border border-orange/20 text-center">
        <p className="text-sm text-gray-slate dark:text-gray-400">No certificate products available at this time.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-light dark:border-gray-600 mb-6">
        {availableLevels.map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => setActiveTab(level)}
            className={
              activeTab === level
                ? 'px-4 py-2.5 text-sm font-medium border-b-2 border-orange text-orange -mb-px transition-colors'
                : 'px-4 py-2.5 text-sm font-medium border-b-2 border-transparent text-gray-slate dark:text-gray-400 hover:text-orange-dark dark:hover:text-gray-200 -mb-px transition-colors'
            }
          >
            {level.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Level description */}
      <p className="text-sm text-gray-slate dark:text-gray-400 mb-4">
        {LEVEL_DESCRIPTIONS[activeTab]}
      </p>

      {/* Product grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleProducts.map((product) => (
          <button
            key={product.product_type}
            type="button"
            onClick={() => onSelect(product)}
            className="text-left rounded-xl border border-gray-light dark:border-gray-600 bg-white dark:bg-gray-800 p-5 hover:border-orange hover:shadow-md transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-orange focus-visible:ring-offset-1 group"
          >
            {/* Badges row */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${LEVEL_BADGE_CLASSES[product.validation_level]}`}
              >
                {product.validation_level.toUpperCase()}
              </span>
              {product.wildcard && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange/10 text-orange border border-orange/20">
                  Wildcard
                </span>
              )}
              {product.san && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-light dark:bg-gray-700 text-gray-slate dark:text-gray-300 border border-gray-light dark:border-gray-600">
                  SAN
                </span>
              )}
            </div>

            {/* Product name */}
            <p className="font-bold text-orange-dark dark:text-white text-base mb-1 group-hover:text-orange transition-colors">
              {product.display_name}
            </p>

            {/* Validation level label */}
            <p className="text-xs text-gray-slate dark:text-gray-400 mb-3">
              {LEVEL_LABELS[product.validation_level]}
            </p>

            {/* Price */}
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-orange">
                ${product.price.toFixed(2)}
              </span>
              <span className="text-xs text-gray-slate dark:text-gray-400">/yr</span>
            </div>

            {/* CTA hint */}
            <p className="mt-3 text-xs font-medium text-orange opacity-0 group-hover:opacity-100 transition-opacity">
              Select &rarr;
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
