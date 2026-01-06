'use client';

import { useState, useRef, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { getChangedFields, formatTimestamp, type ChangedField } from '@/lib/utils/audit-formatting';

interface DiffViewerProps {
  oldData: any;
  newData: any;
  tableName?: string;
  onClose: () => void;
  isOpen?: boolean;
}

export function DiffViewer({ oldData, newData, tableName = 'zone_records', onClose, isOpen = true }: DiffViewerProps) {
  const [mode, setMode] = useState<'formatted' | 'raw'>('formatted');
  const [copied, setCopied] = useState(false);
  
  // Preserve data during close animation - store last valid data
  const preservedDataRef = useRef({ oldData: null, newData: null, tableName });
  
  useEffect(() => {
    // Update preserved data when we have valid data
    if (oldData || newData) {
      preservedDataRef.current = { oldData, newData, tableName };
    }
  }, [oldData, newData, tableName]);
  
  // Use current props if valid, otherwise fall back to preserved data during close animation
  // This ensures first render after refresh shows data, and close animation doesn't collapse
  const displayOldData = (oldData || newData) ? oldData : preservedDataRef.current.oldData;
  const displayNewData = (oldData || newData) ? newData : preservedDataRef.current.newData;
  const displayTableName = (oldData || newData) ? tableName : preservedDataRef.current.tableName;

  const formatJSON = (data: any) => {
    if (!data) return 'null';
    return JSON.stringify(data, null, 2);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const changedFields = getChangedFields(displayOldData, displayNewData, displayTableName);
  
  // Determine the change type
  const changeType = !displayOldData && displayNewData ? 'created' : 
                     displayOldData && !displayNewData ? 'deleted' : 
                     'updated';

  // Get the entity name based on table name
  const getEntityName = (tableName: string) => {
    switch (tableName) {
      case 'zones':
        return 'zone';
      case 'zone_records':
        return 'record';
      case 'organizations':
        return 'organization';
      default:
        return 'record';
    }
  };

  const entityName = getEntityName(displayTableName);

  const changeTypeMessage = changeType === 'created' ? `New ${entityName} created` :
                            changeType === 'deleted' ? `${entityName.charAt(0).toUpperCase() + entityName.slice(1)} deleted` :
                            `${changedFields.length} field(s) changed`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Change Diff"
      subtitle={changeTypeMessage}
      size="large"
    >
      {/* Mode Toggle */}
      <div className="flex items-center justify-end mb-6 pb-4 dark:border-gray-700">
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
      </div>

      {/* Content */}
      <div className="max-h-[60vh] overflow-y-auto">
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
              {(displayOldData?.updated_at || displayNewData?.updated_at) && (
                <div className="mt-6 pt-4 dark:border-gray-700">
                  <p className="text-xs text-gray-slate dark:text-gray-400">
                    Last updated: {formatTimestamp(displayNewData?.updated_at || displayOldData?.updated_at)}
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
                  {displayOldData && (
                    <button
                      onClick={() => handleCopy(formatJSON(displayOldData))}
                      className="text-xs text-gray-slate dark:text-gray-400 hover:text-orange-dark dark:hover:text-orange"
                    >
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  )}
                </div>
                <pre className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-xs font-mono overflow-x-auto text-gray-900 dark:text-gray-100">
                  {formatJSON(displayOldData)}
                </pre>
              </div>

              {/* New Data */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-green-600 dark:text-green-400">After</h3>
                  {displayNewData && (
                    <button
                      onClick={() => handleCopy(formatJSON(displayNewData))}
                      className="text-xs text-gray-slate dark:text-gray-400 hover:text-orange-dark dark:hover:text-orange"
                    >
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  )}
                </div>
                <pre className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-xs font-mono overflow-x-auto text-gray-900 dark:text-gray-100">
                  {formatJSON(displayNewData)}
                </pre>
              </div>
            </div>
          )}
      </div>
    </Modal>
  );
}

