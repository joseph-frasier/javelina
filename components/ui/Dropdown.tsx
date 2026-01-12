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
}

export default function Dropdown({
  label,
  value,
  options,
  onChange,
  className,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close dropdown when clicking outside
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
        <label className="block text-sm font-medium text-orange-dark mb-2">
          {label}
        </label>
      )}

      {/* Dropdown Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          "w-full px-4 py-2.5 rounded-md border bg-white dark:bg-gray-800 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-orange focus-visible:ring-offset-0 text-orange-dark dark:text-gray-100 flex items-center justify-between transition-colors",
          isOpen
            ? "border-orange"
            : "border-gray-light dark:border-gray-600 hover:border-orange/50"
        )}
      >
        <span className="font-regular">{selectedOption?.label || 'Select...'}</span>
        <svg
          className={clsx(
            'w-5 h-5 text-gray-slate transition-transform',
            isOpen && 'transform rotate-180'
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

      {/* Dropdown Menu - Positioned Below */}
      {isOpen && (
        <div className="absolute z-[9999] w-full mt-1 bg-white dark:bg-gray-800 border border-gray-light dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value)}
              className={clsx(
                'w-full px-3 py-2 text-left hover:bg-orange-light/30 dark:hover:bg-orange-light/10 transition-colors',
                option.value === value
                  ? 'bg-orange-light text-orange font-medium'
                  : 'text-orange-dark dark:text-gray-100'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
