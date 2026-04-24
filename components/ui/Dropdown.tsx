'use client';

import { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';

interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  label?: string;
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

export default function Dropdown({
  label,
  value,
  options,
  onChange,
  className,
  disabled = false,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className={clsx('relative', className)}>
      {label && (
        <label className="block text-sm font-medium text-text mb-1.5">
          {label}
        </label>
      )}

      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={clsx(
          'w-full h-10 px-3 rounded-md border bg-surface text-text text-sm',
          'flex items-center justify-between gap-2 text-left',
          'transition-[border-color,box-shadow] duration-150',
          'focus-visible:outline-none focus-visible:shadow-focus-ring',
          isOpen
            ? 'border-accent'
            : 'border-border hover:border-border-strong',
          disabled && 'opacity-50 cursor-not-allowed bg-surface-alt'
        )}
      >
        <span className="truncate font-normal">
          {selectedOption?.label || 'Select...'}
        </span>
        <svg
          className={clsx(
            'h-4 w-4 shrink-0 text-text-muted transition-transform duration-150',
            isOpen && 'rotate-180'
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <ul
          role="listbox"
          className="absolute z-[9999] w-full mt-1 bg-surface border border-border rounded-md shadow-popover max-h-60 overflow-auto py-1"
        >
          {options.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                role="option"
                aria-selected={option.value === value}
                onClick={() => handleSelect(option.value)}
                className={clsx(
                  'w-full px-3 py-2 text-left text-sm transition-colors duration-100',
                  option.value === value
                    ? 'bg-accent-soft text-accent font-medium'
                    : 'text-text hover:bg-surface-hover'
                )}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
