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
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Results for "${query}"`}
      size="large"
    >
      <div className="space-y-6">
        {lookupResults.length > 0 && (
          <DomainSearchResults
            results={lookupResults}
            title="Availability"
            onRegister={onRegister}
          />
        )}

        {suggestions.length > 0 && (
          <DomainSearchResults
            results={suggestions}
            title="Suggestions"
            onRegister={onRegister}
          />
        )}

        {lookupResults.length === 0 && suggestions.length === 0 && (
          <p className="text-center text-gray-500 dark:text-gray-400 py-8">
            No results found. Try a different domain name.
          </p>
        )}
      </div>
    </Modal>
  );
}
