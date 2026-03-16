'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card } from '@/components/ui/Card';
import DomainSearchBar from '@/components/domains/DomainSearchBar';
import DomainSearchResults from '@/components/domains/DomainSearchResults';
import DomainCheckoutForm from '@/components/domains/DomainCheckoutForm';
import DomainsList from '@/components/domains/DomainsList';
import { domainsApi } from '@/lib/api-client';
import type {
  DomainSearchResult,
  DomainRegistrationType,
  Domain,
} from '@/types/domains';

type View = 'search' | 'checkout';

export default function DomainsPage() {
  const searchParams = useSearchParams();
  const [view, setView] = useState<View>('search');

  // Search state
  const [isSearching, setIsSearching] = useState(false);
  const [lookupResults, setLookupResults] = useState<DomainSearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<DomainSearchResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Checkout state
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [registrationType, setRegistrationType] = useState<DomainRegistrationType>('new');
  const [selectedPrice, setSelectedPrice] = useState<number>(0);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('USD');

  // My domains state
  const [domains, setDomains] = useState<Domain[]>([]);
  const [isLoadingDomains, setIsLoadingDomains] = useState(true);

  // Success/cancel messages from Stripe redirect
  const success = searchParams.get('success');
  const cancelled = searchParams.get('cancelled');

  const loadDomains = useCallback(async () => {
    try {
      setIsLoadingDomains(true);
      const result = await domainsApi.list();
      setDomains(result.domains || []);
    } catch (err) {
      console.error('Failed to load domains:', err);
    } finally {
      setIsLoadingDomains(false);
    }
  }, []);

  useEffect(() => {
    loadDomains();
  }, [loadDomains]);

  // Reload domains after successful checkout
  useEffect(() => {
    if (success === 'true') {
      loadDomains();
    }
  }, [success, loadDomains]);

  const handleSearch = async (query: string) => {
    setIsSearching(true);
    setSearchError(null);
    setLookupResults([]);
    setSuggestions([]);

    try {
      const result = await domainsApi.search(query);
      setLookupResults(result.lookup || []);
      setSuggestions(result.suggestions || []);
    } catch (err: any) {
      const message = err?.details || err?.message || 'Search failed';
      setSearchError(typeof message === 'string' ? message : 'Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const handleRegister = (domain: string) => {
    const result = lookupResults.find((r) => r.domain === domain)
      || suggestions.find((r) => r.domain === domain);

    setSelectedDomain(domain);
    setRegistrationType('new');
    setSelectedPrice(result?.pricing?.price || 12.99);
    setSelectedCurrency(result?.pricing?.currency || 'USD');
    setView('checkout');
  };

  const handleTransfer = (domain: string) => {
    const result = lookupResults.find((r) => r.domain === domain);

    setSelectedDomain(domain);
    setRegistrationType('transfer');
    setSelectedPrice(result?.pricing?.price || 12.99);
    setSelectedCurrency(result?.pricing?.currency || 'USD');
    setView('checkout');
  };

  const handleCheckoutCancel = () => {
    setView('search');
    setSelectedDomain(null);
  };

  const handleCheckoutSuccess = () => {
    setView('search');
    setSelectedDomain(null);
    loadDomains();
  };

  return (
    <ProtectedRoute>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-orange-dark dark:text-white">
            Domains
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Search, register, and manage your domain names.
          </p>
        </div>

        {/* Success / Cancel Messages */}
        {success === 'true' && (
          <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <p className="text-sm text-green-700 dark:text-green-400 font-medium">
              Payment successful! Your domain is being processed. This may take a few moments.
            </p>
          </div>
        )}
        {cancelled === 'true' && (
          <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm text-yellow-700 dark:text-yellow-400 font-medium">
              Checkout was cancelled. You can try again anytime.
            </p>
          </div>
        )}

        {view === 'search' && (
          <>
            {/* Domain Search */}
            <Card title="Find a domain">
              <div className="space-y-6">
                <DomainSearchBar onSearch={handleSearch} isLoading={isSearching} />

                {searchError && (
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <p className="text-sm text-red-700 dark:text-red-400">{searchError}</p>
                  </div>
                )}

                {lookupResults.length > 0 && (
                  <DomainSearchResults
                    results={lookupResults}
                    title="Availability"
                    onRegister={handleRegister}
                    onTransfer={handleTransfer}
                  />
                )}

                {suggestions.length > 0 && (
                  <DomainSearchResults
                    results={suggestions}
                    title="Suggestions"
                    onRegister={handleRegister}
                    onTransfer={handleTransfer}
                  />
                )}
              </div>
            </Card>

            {/* My Domains */}
            <Card title="My Domains">
              <DomainsList domains={domains} isLoading={isLoadingDomains} />
            </Card>
          </>
        )}

        {view === 'checkout' && selectedDomain && (
          <DomainCheckoutForm
            domain={selectedDomain}
            registrationType={registrationType}
            price={selectedPrice}
            currency={selectedCurrency}
            onCancel={handleCheckoutCancel}
            onSuccess={handleCheckoutSuccess}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}
