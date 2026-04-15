'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';
import Button from '@/components/ui/Button';
import { useAuthStore } from '@/lib/auth-store';
import { useToastStore } from '@/lib/toast-store';
import { useFeatureFlags } from '@/lib/hooks/useFeatureFlags';
import { storefrontApi } from '@/lib/api-client';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { gsap } from 'gsap';

interface StorefrontProduct {
  id: string;
  code: string;
  name: string;
  description: string;
  price: number;
  billing_interval: string;
  features: string[];
  is_active: boolean;
}

export default function StorefrontPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = searchParams.get('status');
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const addToast = useToastStore((state) => state.addToast);
  const { showBusinessProducts, showBusinessStarter, showBusinessPro } = useFeatureFlags();

  const [products, setProducts] = useState<StorefrontProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [showCustomerFields, setShowCustomerFields] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');

  const contentRef = useRef<HTMLDivElement>(null);
  const [isInitialMount, setIsInitialMount] = useState(true);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/storefront');
    }
  }, [isAuthenticated, router]);

  // Redirect if master flag is off
  useEffect(() => {
    if (!loading && !showBusinessProducts) {
      router.push('/');
    }
  }, [showBusinessProducts, loading, router]);

  // Show toast on return from Stripe
  useEffect(() => {
    if (status === 'success') {
      addToast('success', 'Subscription created successfully! You will receive a confirmation email shortly.');
    } else if (status === 'canceled') {
      addToast('info', 'Checkout was canceled. No charges were made.');
    }
  }, [status, addToast]);

  // Fetch products
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const data = await storefrontApi.getProducts();
        setProducts(data);
      } catch (error) {
        console.error('Failed to load storefront products:', error);
        addToast('error', 'Failed to load products');
      } finally {
        setLoading(false);
      }
    };
    if (isAuthenticated) {
      loadProducts();
    }
  }, [isAuthenticated, addToast]);

  // GSAP page transition
  useEffect(() => {
    if (contentRef.current && isInitialMount && !loading) {
      gsap.fromTo(
        contentRef.current,
        { opacity: 0, x: 30 },
        {
          opacity: 1,
          x: 0,
          duration: 0.5,
          ease: 'power2.out',
          onComplete: () => setIsInitialMount(false),
        }
      );
    }
  }, [isInitialMount, loading]);

  const handleSubscribe = async (productCode: string) => {
    setCheckoutLoading(productCode);
    try {
      const result = await storefrontApi.createCheckout(
        productCode,
        showCustomerFields ? customerName : undefined,
        showCustomerFields ? customerEmail : undefined,
      );

      if (result.url) {
        window.location.href = result.url;
      } else {
        addToast('error', 'Failed to create checkout session');
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      addToast('error', error.message || 'Failed to start checkout');
    } finally {
      setCheckoutLoading(null);
    }
  };

  // Filter products by individual LD flags
  const visibleProducts = products.filter((product) => {
    if (product.code === 'business_starter' && !showBusinessStarter) return false;
    if (product.code === 'business_pro' && !showBusinessPro) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-orange-light">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange"></div>
          <span className="text-orange-dark">Loading storefront...</span>
        </div>
      </div>
    );
  }

  if (!showBusinessProducts) {
    return null;
  }

  return (
    <div className="min-h-screen bg-orange-light">
      {/* Header */}
      <header className="border-b border-gray-light bg-white" role="banner">
        <div className="max-w-7xl mx-auto pl-2 pr-4 sm:pl-3 sm:pr-6 lg:pl-4 lg:pr-8 py-1 flex items-center justify-between">
          <Link href="/" className="inline-block cursor-pointer" aria-label="Go to home page">
            <Logo width={150} height={60} />
          </Link>
          <Breadcrumb
            items={[
              { label: 'Dashboard', href: '/' },
              { label: 'Storefront' },
            ]}
          />
        </div>
      </header>

      {/* Main Content */}
      <main ref={contentRef} className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8" role="main">
        {/* Hero */}
        <section className="text-center mb-10" aria-labelledby="storefront-heading">
          <h1 id="storefront-heading" className="text-3xl font-black text-orange-dark mb-2">
            Business Services
          </h1>
          <p className="text-base text-gray-slate font-light max-w-2xl mx-auto">
            Fully managed business packages. Domain, hosting, email, and website — all included in one monthly subscription.
          </p>
        </section>

        {/* Purchasing on behalf of someone else */}
        <section className="max-w-xl mx-auto mb-8">
          <button
            type="button"
            onClick={() => setShowCustomerFields(!showCustomerFields)}
            className="text-sm text-orange hover:text-orange-dark font-medium transition-colors"
          >
            {showCustomerFields ? 'Cancel — purchasing for myself' : 'Purchasing for someone else?'}
          </button>
          {showCustomerFields && (
            <div className="mt-3 p-4 bg-white rounded-lg border border-gray-light space-y-3">
              <p className="text-xs text-gray-slate">
                Enter the customer&apos;s details. They will receive invoices at the email below.
              </p>
              <div>
                <label htmlFor="customer-name" className="block text-sm font-medium text-orange-dark mb-1">
                  Customer Name
                </label>
                <input
                  id="customer-name"
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-3 py-2 border border-gray-light rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="customer-email" className="block text-sm font-medium text-orange-dark mb-1">
                  Customer Email
                </label>
                <input
                  id="customer-email"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="w-full px-3 py-2 border border-gray-light rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange focus:border-transparent"
                />
              </div>
            </div>
          )}
        </section>

        {/* Product Cards */}
        <section aria-labelledby="products-heading">
          <h2 id="products-heading" className="sr-only">Available Products</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {visibleProducts.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-xl border-2 border-gray-light shadow-lg p-6 flex flex-col"
              >
                <h3 className="text-xl font-bold text-orange-dark mb-1">
                  {product.name}
                </h3>
                <p className="text-sm text-gray-slate font-light mb-4">
                  {product.description}
                </p>

                {/* Price */}
                <div className="mb-4">
                  <span className="text-3xl font-black text-orange-dark">
                    ${product.price.toFixed(2)}
                  </span>
                  <span className="text-sm text-gray-slate font-light">
                    /{product.billing_interval} + applicable tax
                  </span>
                </div>

                {/* Features */}
                <ul className="space-y-2 mb-6 flex-1">
                  {product.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start">
                      <svg
                        className="w-5 h-5 text-orange mr-2 flex-shrink-0 mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
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
                    </li>
                  ))}
                </ul>

                {/* Subscribe Button */}
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full"
                  onClick={() => handleSubscribe(product.code)}
                  disabled={checkoutLoading !== null}
                >
                  {checkoutLoading === product.code ? 'Redirecting...' : 'Subscribe'}
                </Button>
              </div>
            ))}
          </div>

          {visibleProducts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-slate">No products are currently available.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
