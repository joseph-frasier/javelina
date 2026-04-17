'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import DomainSearchResults from '@/components/domains/DomainSearchResults';
import type { DomainSearchResult } from '@/types/domains';

interface DomainSearchResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  query: string;
  lookupResults: DomainSearchResult[];
  suggestions: DomainSearchResult[];
  onRegister: (domain: string) => void;
}

export function DomainSearchResultsModal({
  isOpen,
  onClose,
  query,
  lookupResults,
  suggestions,
  onRegister,
}: DomainSearchResultsModalProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const hasLookup = lookupResults.length > 0;
  const hasSuggestions = suggestions.length > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Results for "${query}"`}
      size="large"
    >
      <div className="space-y-6">
        {hasLookup && (
          <DomainSearchResults
            results={lookupResults}
            title="Availability"
            onRegister={onRegister}
          />
        )}

        {hasSuggestions && (
          <div>
            <button
              type="button"
              onClick={() => setShowSuggestions(!showSuggestions)}
              className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-orange dark:hover:text-orange transition-colors"
            >
              <svg
                className={`w-4 h-4 transition-transform duration-200 ${showSuggestions ? 'rotate-90' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
              Suggestions ({suggestions.length})
            </button>
            {showSuggestions && (
              <div className="mt-3">
                <DomainSearchResults
                  results={suggestions}
                  title=""
                  onRegister={onRegister}
                />
              </div>
            )}
          </div>
        )}

        {!hasLookup && !hasSuggestions && (
          <p className="text-center text-gray-500 dark:text-gray-400 py-8">
            No results found. Try a different domain name.
          </p>
        )}
      </div>
    </Modal>
  );
}
