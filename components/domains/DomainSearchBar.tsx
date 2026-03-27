'use client';

import { useState, FormEvent } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface DomainSearchBarProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
}

export default function DomainSearchBar({ onSearch, isLoading }: DomainSearchBarProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim().toLowerCase();
    if (trimmed) {
      onSearch(trimmed);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-3 items-end">
      <div className="flex-1">
        <Input
          label="Search for a domain"
          placeholder="e.g. mybusiness.com or mybusiness"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          suffixHint={query && !query.includes('.') ? '.com' : undefined}
        />
      </div>
      <Button type="submit" variant="primary" size="md" disabled={isLoading || !query.trim()}>
        {isLoading ? (
          <span className="flex items-center gap-2">
            <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            Searching...
          </span>
        ) : (
          'Search domains'
        )}
      </Button>
    </form>
  );
}
