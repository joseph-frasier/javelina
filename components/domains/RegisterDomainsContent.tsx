'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import DomainSearchBar from '@/components/domains/DomainSearchBar';
import DomainSearchResults from '@/components/domains/DomainSearchResults';
import DomainCheckoutForm from '@/components/domains/DomainCheckoutForm';
import { domainsApi } from '@/lib/api-client';
import type { DomainSearchResult } from '@/types/domains';

type View = 'search' | 'checkout';

export default function RegisterDomainsContent() {
  const [view, setView] = useState<View>('search');

  const [isSearching, setIsSearching] = useState(false);
  const [lookupResults, setLookupResults] = useState<DomainSearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<DomainSearchResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [selectedPrice, setSelectedPrice] = useState<number>(0);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('USD');

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
  };

  return (
    <div className="space-y-6">
      {view === 'search' && (
        <Card title="Find a domain" description="Search for available domain names across hundreds of TLDs.">
          <div className="space-y-6">
            <DomainSearchBar onSearch={handleSearch} isLoading={isSearching} />

            {searchError && (
              <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex gap-2.5">
                <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <p className="text-sm text-red-700 dark:text-red-400">{searchError}</p>
              </div>
            )}

            {lookupResults.length > 0 && (
              <DomainSearchResults
                results={lookupResults}
                title="Availability"
                onRegister={handleRegister}
              />
            )}

            {suggestions.length > 0 && (
              <DomainSearchResults
                results={suggestions}
                title="Suggestions"
                onRegister={handleRegister}
              />
            )}
          </div>
        </Card>
      )}

      {view === 'checkout' && selectedDomain && (
        <DomainCheckoutForm
          domain={selectedDomain}
          registrationType="new"
          price={selectedPrice}
          currency={selectedCurrency}
          onCancel={handleCheckoutCancel}
          onSuccess={handleCheckoutSuccess}
        />
      )}
    </div>
  );
}
