'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { clsx } from 'clsx';

interface CaaTagOption {
  value: string;
  label: string;
}

interface CaaTagDropdownProps {
  id?: string;
  label?: string;
  value: string;
  options: CaaTagOption[];
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
}

export default function CaaTagDropdown({
  id,
  label,
  value,
  options,
  onChange,
  className,
  disabled = false,
  placeholder = 'issue',
}: CaaTagDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = `${id || 'caa-tag'}-listbox`;

  const filteredOptions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return options;
    return options.filter((option) => option.value.toLowerCase().includes(query));
  }, [options, searchQuery]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const applyValue = (next: string) => {
    onChange(next.toLowerCase());
  };

  return (
    <div ref={rootRef} className={clsx('relative', className)}>
      {label && (
        <label htmlFor={id} className="mb-2 block text-sm font-medium text-text">
          {label}
        </label>
      )}

      <div className="relative">
        <input
          id={id}
          type="text"
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-haspopup="listbox"
          onFocus={() => {
            if (!disabled) {
              setSearchQuery('');
              setIsOpen(true);
            }
          }}
          onChange={(event) => {
            setSearchQuery(event.target.value);
            applyValue(event.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setIsOpen(false);
            }
          }}
          className={clsx(
            'w-full rounded-md border bg-surface px-4 py-2.5 pr-10 text-left text-text transition-colors',
            'font-regular dark:bg-gray-800 dark:text-gray-100',
            'placeholder:text-text-faint',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-0',
            'border-border hover:border-accent/50 dark:border-gray-600',
            disabled && 'cursor-not-allowed opacity-50 bg-surface-alt dark:bg-gray-700'
          )}
        />
        <button
          type="button"
          aria-label="Toggle CAA tag options"
          disabled={disabled}
          onClick={() =>
            setIsOpen((prev) => {
              const next = !prev;
              if (next) setSearchQuery('');
              return next;
            })
          }
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-accent"
        >
          <svg
            className={clsx('h-4 w-4 transition-transform', isOpen && 'rotate-180')}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {isOpen && !disabled && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute z-[9999] mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-surface shadow-lg dark:border-gray-600 dark:bg-gray-800"
        >
          {filteredOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              onClick={() => {
                applyValue(option.value);
                setSearchQuery('');
                setIsOpen(false);
              }}
              className={clsx(
                'w-full px-3 py-2 text-left transition-colors hover:bg-accent-light/30 dark:hover:bg-accent-light/10',
                option.value === value ? 'bg-accent-light text-accent font-medium' : 'text-text'
              )}
            >
              {option.label}
            </button>
          ))}
          {filteredOptions.length === 0 && (
            <p className="px-3 py-2 text-sm text-text-muted">No matching tags</p>
          )}
        </div>
      )}
    </div>
  );
}
