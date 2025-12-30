'use client';

import { useState } from 'react';
import { getChangedFields, formatTimestamp, type ChangedField } from '@/lib/utils/audit-formatting';

interface DiffViewerProps {
  oldData: any;
  newData: any;
  tableName?: string;
  onClose: () => void;
}

export function DiffViewer({ oldData, newData, tableName = 'zone_records', onClose }: DiffViewerProps) {
  const [mode, setMode] = useState<'formatted' | 'raw'>('formatted');
  const [copied, setCopied] = useState(false);

  const formatJSON = (data: any) => {
    if (!data) return 'null';
    return JSON.stringify(data, null, 2);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const changedFields = getChangedFields(oldData, newData, tableName);
  
  // Determine the change type
  const changeType = !oldData && newData ? 'created' : 
                     oldData && !newData ? 'deleted' : 
                     'updated';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-light dark:border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-orange-dark dark:text-orange">Change Diff</h2>
            <p className="text-sm text-gray-slate dark:text-gray-400 mt-1">
              {changeType === 'created' && 'New record created'}
              {changeType === 'deleted' && 'Record deleted'}
              {changeType === 'updated' && `${changedFields.length} field(s) changed`}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {/* Mode Toggle */}
            <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setMode('formatted')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  mode === 'formatted'
                    ? 'bg-white dark:bg-gray-700 text-orange-dark dark:text-orange shadow-sm'
                    : 'text-gray-slate dark:text-gray-400 hover:text-orange-dark dark:hover:text-orange'
                }`}
              >
                Formatted
              </button>
              <button
                onClick={() => setMode('raw')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  mode === 'raw'
                    ? 'bg-white dark:bg-gray-700 text-orange-dark dark:text-orange shadow-sm'
                    : 'text-gray-slate dark:text-gray-400 hover:text-orange-dark dark:hover:text-orange'
                }`}
              >
                Raw JSON
              </button>
            </div>
            
            {/* Close Button */}
            <button
              onClick={onClose}
              className="text-gray-slate dark:text-gray-400 hover:text-orange-dark dark:hover:text-orange"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {mode === 'formatted' ? (
            /* Formatted View - Field by Field List (Option 1) */
            <div className="space-y-4">
              {changedFields.length === 0 ? (
                <div className="text-center py-8 text-gray-slate dark:text-gray-400">
                  No changes detected
                </div>
              ) : (
                changedFields.map((change) => (
                  <div
                    key={change.field}
                    className="border border-gray-light dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50"
                  >
                    {/* Field Name */}
                    <div className="flex items-center mb-3">
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                        {change.fieldName}
                      </h4>
                      {changeType === 'updated' && (
                        <span className="ml-2 px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300">
                          Modified
                        </span>
                      )}
                    </div>

                    {/* Values Comparison */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Before Value */}
                      <div>
                        <div className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">
                          Before
                        </div>
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded px-3 py-2 min-h-[2.5rem] flex items-center">
                          <span className="text-sm text-red-900 dark:text-red-100 break-all">
                            {change.oldFormatted}
                          </span>
                        </div>
                      </div>

                      {/* After Value */}
                      <div>
                        <div className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">
                          After
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded px-3 py-2 min-h-[2.5rem] flex items-center">
                          <span className="text-sm text-green-900 dark:text-green-100 break-all">
                            {change.newFormatted}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}

              {/* Metadata Footer */}
              {(oldData?.updated_at || newData?.updated_at) && (
                <div className="mt-6 pt-4 border-t border-gray-light dark:border-gray-700">
                  <p className="text-xs text-gray-slate dark:text-gray-400">
                    Last updated: {formatTimestamp(newData?.updated_at || oldData?.updated_at)}
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Raw JSON View */
            <div className="grid grid-cols-2 gap-4">
              {/* Old Data */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-red-600 dark:text-red-400">Before</h3>
                  {oldData && (
                    <button
                      onClick={() => handleCopy(formatJSON(oldData))}
                      className="text-xs text-gray-slate dark:text-gray-400 hover:text-orange-dark dark:hover:text-orange"
                    >
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  )}
                </div>
                <pre className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-xs font-mono overflow-x-auto text-gray-900 dark:text-gray-100">
                  {formatJSON(oldData)}
                </pre>
              </div>

              {/* New Data */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-green-600 dark:text-green-400">After</h3>
                  {newData && (
                    <button
                      onClick={() => handleCopy(formatJSON(newData))}
                      className="text-xs text-gray-slate dark:text-gray-400 hover:text-orange-dark dark:hover:text-orange"
                    >
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  )}
                </div>
                <pre className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-xs font-mono overflow-x-auto text-gray-900 dark:text-gray-100">
                  {formatJSON(newData)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

