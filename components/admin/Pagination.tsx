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
      <div className="flex flex-col sm:flex-row items-center justify-end gap-2 sm:gap-3">
        <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-100">
          {startItem}-{endItem} of {totalItems}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevious}
            disabled={currentPage === 1}
            className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm"
          >
            ← Previous
          </Button>
          <span className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
            {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNext}
            disabled={currentPage === totalPages}
            className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm"
          >
            Next →
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 py-4">
      <Button
        variant="outline"
        size="sm"
        onClick={handlePrevious}
        disabled={currentPage === 1}
        className="px-3 sm:px-4 py-2 text-xs sm:text-sm w-full sm:w-auto"
      >
        ← Previous
      </Button>
      <div className="flex flex-col items-center gap-1">
        <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
          Page {currentPage} of {totalPages}
        </span>
        <span className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-100 whitespace-nowrap">
          Showing {startItem}-{endItem} of {totalItems}
        </span>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleNext}
        disabled={currentPage === totalPages}
        className="px-3 sm:px-4 py-2 text-xs sm:text-sm w-full sm:w-auto"
      >
        Next →
      </Button>
    </div>
  );
}

