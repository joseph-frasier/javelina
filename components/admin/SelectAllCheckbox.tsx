'use client';

import { useState, useRef, useEffect } from 'react';

interface SelectAllCheckboxProps {
  selectedCount: number;
  pageCount: number;
  totalCount: number;
  pageSelectedCount: number;
  onSelectPage: () => void;
  onSelectAll: () => void;
  onSelectNone: () => void;
}

export function SelectAllCheckbox({
  selectedCount,
  pageCount,
  totalCount,
  pageSelectedCount,
  onSelectPage,
  onSelectAll,
  onSelectNone
}: SelectAllCheckboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Check if all items on current page are selected
  const isPageFullySelected = pageSelectedCount === pageCount && pageCount > 0;
  const isPartiallySelected = selectedCount > 0 && selectedCount < totalCount;

  const handleCheckboxClick = () => {
    if (isPageFullySelected) {
      // If current page is fully selected, deselect the page items
      onSelectNone();
    } else {
      // Select all items on current page
      onSelectPage();
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex items-center">
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={isPageFullySelected}
          ref={(el) => {
            if (el) el.indeterminate = isPartiallySelected && !isPageFullySelected;
          }}
          onChange={handleCheckboxClick}
          className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500 cursor-pointer"
        />
        
        {/* Dropdown Arrow */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="ml-1 p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          aria-label="Selection options"
        >
          <svg 
            className={`w-3 h-3 text-gray-500 dark:text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          
          {/* Menu */}
          <div className="absolute left-0 mt-1 w-24 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-20 overflow-hidden">
            <button
              onClick={() => {
                onSelectAll();
                setIsOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              All
            </button>
            <button
              onClick={() => {
                onSelectNone();
                setIsOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              None
            </button>
          </div>
        </>
      )}
    </div>
  );
}

