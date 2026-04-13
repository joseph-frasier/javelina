'use client';

import { useState } from 'react';
import DomainSearchBar from '@/components/domains/DomainSearchBar';
import { DomainSearchResultsModal } from '@/components/modals/DomainSearchResultsModal';
import { domainsApi } from '@/lib/api-client';
import { useToastStore } from '@/lib/toast-store';
import type { DomainSearchResult } from '@/types/domains';

const POPULAR_TLDS = ['.com', '.net', '.io', '.org', '.dev', '.co'];

interface RegisterDomainsContentProps {
  onCheckout: (domain: string, price: number, currency: string) => void;
}

export default function RegisterDomainsContent({ onCheckout }: RegisterDomainsContentProps) {
  const [isSearching, setIsSearching] = useState(false);
  const [lookupResults, setLookupResults] = useState<DomainSearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<DomainSearchResult[]>([]);
  const [lastQuery, setLastQuery] = useState('');
  const [isResultsOpen, setIsResultsOpen] = useState(false);

  const { addToast } = useToastStore();

  const handleSearch = async (query: string) => {
    setIsSearching(true);
    setLookupResults([]);
    setSuggestions([]);
    setLastQuery(query);

    try {
      const result = await domainsApi.search(query);
      setLookupResults(result.lookup || []);
      setSuggestions(result.suggestions || []);
      setIsResultsOpen(true);
    } catch (err: any) {
      const message = err?.details || err?.message || 'Search failed';
      addToast('error', typeof message === 'string' ? message : 'Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const handleRegister = (domain: string) => {
    const result = lookupResults.find((r) => r.domain === domain)
      || suggestions.find((r) => r.domain === domain);

    setIsResultsOpen(false);
    onCheckout(domain, result?.pricing?.price || 12.99, result?.pricing?.currency || 'USD');
  };

  const handleTldClick = (tld: string) => {
    const base = lastQuery.includes('.') ? lastQuery.split('.')[0] : lastQuery;
    if (base) {
      handleSearch(base + tld);
    }
  };

  const handleClear = () => {
    setLookupResults([]);
    setSuggestions([]);
    setLastQuery('');
  };

  return (
    <div className="rounded-xl bg-white dark:bg-gray-slate shadow-md border border-gray-light hover:shadow-lg transition-shadow p-8 lg:p-10 space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-orange">Find a domain</h2>
        <p className="text-base text-gray-500 dark:text-gray-400 mt-2">
          Search for available domain names across hundreds of TLDs.
        </p>
      </div>

      <DomainSearchBar
        onSearch={handleSearch}
        onClear={handleClear}
        isLoading={isSearching}
      />

      <div className="flex flex-wrap gap-3">
        {POPULAR_TLDS.map(tld => (
          <button
            key={tld}
            type="button"
            onClick={() => handleTldClick(tld)}
            className="px-4 py-2 rounded-lg text-sm font-mono font-semibold border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-300 hover:border-orange hover:text-orange hover:bg-orange/5 transition-all"
          >
            {tld}
          </button>
        ))}
      </div>

      {/* Tips */}
      <div className="space-y-4 pt-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Quick tips</p>
        <ul className="space-y-3">
          {[
            'Keep it short, memorable, and easy to spell',
            'Use .com when possible, it\'s the most recognized',
            'Avoid hyphens and numbers if you can',
            'Check for trademark conflicts before registering',
          ].map((tip) => (
            <li key={tip} className="flex items-start gap-3 text-sm text-gray-500 dark:text-gray-400">
              <svg className="w-5 h-5 text-orange mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
              </svg>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>

      <DomainSearchResultsModal
        isOpen={isResultsOpen}
        onClose={() => setIsResultsOpen(false)}
        query={lastQuery}
        lookupResults={lookupResults}
        suggestions={suggestions}
        onRegister={handleRegister}
      />
    </div>
  );
}
