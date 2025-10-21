'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import { exportData, ExportFormat } from '@/lib/admin-export';
import { useToastStore } from '@/lib/toast-store';

interface ExportButtonProps {
  data: any[];
  filename: string;
  disabled?: boolean;
  label?: string;
}

export function ExportButton({ data, filename, disabled = false, label = 'Export' }: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { addToast } = useToastStore();

  const handleExport = async (format: ExportFormat) => {
    setIsOpen(false);
    
    if (!data || data.length === 0) {
      addToast('error', 'No data to export');
      return;
    }

    if (data.length > 10000) {
      const proceed = confirm(
        `You're about to export ${data.length.toLocaleString()} rows. This may take a moment. Continue?`
      );
      if (!proceed) return;
    }

    setIsExporting(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay for UX
      exportData(data, format, filename);
      addToast('success', `Exported ${data.length} rows as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export failed:', error);
      addToast('error', 'Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || isExporting}
        className="flex items-center gap-2"
      >
        {isExporting ? (
          <>
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Exporting...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {label}
            <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </>
        )}
      </Button>

      {isOpen && !isExporting && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Menu */}
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20 overflow-hidden">
            <div className="py-1">
              <button
                onClick={() => handleExport('csv')}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div>
                  <div className="font-medium">Export as CSV</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">For Excel, Google Sheets</div>
                </div>
              </button>

              <button
                onClick={() => handleExport('json')}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                <div>
                  <div className="font-medium">Export as JSON</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">For developers, APIs</div>
                </div>
              </button>

              <button
                onClick={() => handleExport('excel')}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <div>
                  <div className="font-medium">Export as Excel</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">XLSX with formatting</div>
                </div>
              </button>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-2 text-xs text-gray-500 dark:text-gray-400">
              {data.length.toLocaleString()} rows to export
            </div>
          </div>
        </>
      )}
    </div>
  );
}

