'use client';

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
  const hasLookup = lookupResults.length > 0;
  const hasSuggestions = suggestions.length > 0;
  const hasBoth = hasLookup && hasSuggestions;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Results for "${query}"`}
      size="xlarge"
    >
      {hasBoth ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <DomainSearchResults
            results={lookupResults}
            title="Availability"
            onRegister={onRegister}
          />
          <DomainSearchResults
            results={suggestions}
            title="Suggestions"
            onRegister={onRegister}
          />
        </div>
      ) : (
        <div>
          {hasLookup && (
            <DomainSearchResults
              results={lookupResults}
              title="Availability"
              onRegister={onRegister}
            />
          )}
          {hasSuggestions && (
            <DomainSearchResults
              results={suggestions}
              title="Suggestions"
              onRegister={onRegister}
            />
          )}
          {!hasLookup && !hasSuggestions && (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">
              No results found. Try a different domain name.
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
