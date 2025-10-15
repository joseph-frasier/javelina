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
        className="w-full px-3 py-2 rounded-md border border-gray-light bg-white text-left focus:outline-none focus:ring-2 focus:ring-orange text-orange-dark flex items-center justify-between"
      >
        <span>{selectedOption?.label || 'Select...'}</span>
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
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-light rounded-md shadow-lg max-h-60 overflow-auto">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value)}
              className={clsx(
                'w-full px-3 py-2 text-left hover:bg-orange-light/30 transition-colors',
                option.value === value
                  ? 'bg-orange-light text-orange font-medium'
                  : 'text-orange-dark'
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
