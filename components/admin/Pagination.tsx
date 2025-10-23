import React from 'react';
import Button from '@/components/ui/Button';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  itemsPerPage: number;
  position?: 'top' | 'bottom';
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
  position = 'bottom'
}: PaginationProps) {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  if (totalPages <= 1) {
    return null; // Don't show pagination if only 1 page
  }

  if (position === 'top') {
    return (
      <div className="flex items-center justify-end gap-2">
        <span className="text-sm text-gray-600 dark:text-gray-100">
          {startItem}-{endItem} of {totalItems}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevious}
            disabled={currentPage === 1}
            className="px-3 py-1.5 text-sm"
          >
            ← Previous
          </Button>
          <span className="px-3 py-1.5 text-sm font-medium text-gray-900 dark:text-white">
            {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNext}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 text-sm"
          >
            Next →
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-4 py-4">
      <Button
        variant="outline"
        size="sm"
        onClick={handlePrevious}
        disabled={currentPage === 1}
        className="px-4 py-2"
      >
        ← Previous
      </Button>
      <div className="flex flex-col items-center gap-1">
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          Page {currentPage} of {totalPages}
        </span>
        <span className="text-xs text-gray-600 dark:text-gray-100">
          Showing {startItem}-{endItem} of {totalItems}
        </span>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleNext}
        disabled={currentPage === totalPages}
        className="px-4 py-2"
      >
        Next →
      </Button>
    </div>
  );
}

