'use client';

import { useState } from 'react';

interface DiffViewerProps {
  oldData: any;
  newData: any;
  onClose: () => void;
}

export function DiffViewer({ oldData, newData, onClose }: DiffViewerProps) {
  const [mode, setMode] = useState<'side-by-side' | 'unified'>('side-by-side');
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

  const getChanges = () => {
    if (!oldData && newData) return { type: 'added', keys: Object.keys(newData) };
    if (oldData && !newData) return { type: 'deleted', keys: Object.keys(oldData) };
    if (!oldData || !newData) return { type: 'none', keys: [] };

    const changes: { key: string; type: 'added' | 'modified' | 'deleted' }[] = [];
    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

    allKeys.forEach(key => {
      if (!(key in oldData)) {
        changes.push({ key, type: 'added' });
      } else if (!(key in newData)) {
        changes.push({ key, type: 'deleted' });
      } else if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
        changes.push({ key, type: 'modified' });
      }
    });

    return { type: 'modified', changes };
  };

  const changes = getChanges();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-light dark:border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-orange-dark dark:text-orange">Change Diff</h2>
            <p className="text-sm text-gray-slate dark:text-gray-400 mt-1">
              {changes.type === 'added' && 'New record created'}
              {changes.type === 'deleted' && 'Record deleted'}
              {changes.type === 'modified' && `${(changes as any).changes.length} field(s) changed`}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {/* Mode Toggle */}
            <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setMode('side-by-side')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  mode === 'side-by-side'
                    ? 'bg-white dark:bg-gray-700 text-orange-dark dark:text-orange shadow-sm'
                    : 'text-gray-slate dark:text-gray-400 hover:text-orange-dark dark:hover:text-orange'
                }`}
              >
                Side by Side
              </button>
              <button
                onClick={() => setMode('unified')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  mode === 'unified'
                    ? 'bg-white dark:bg-gray-700 text-orange-dark dark:text-orange shadow-sm'
                    : 'text-gray-slate dark:text-gray-400 hover:text-orange-dark dark:hover:text-orange'
                }`}
              >
                Unified
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
          {mode === 'side-by-side' ? (
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
          ) : (
            /* Unified View */
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-orange-dark dark:text-orange">Unified Diff</h3>
                <button
                  onClick={() => handleCopy(`Before:\n${formatJSON(oldData)}\n\nAfter:\n${formatJSON(newData)}`)}
                  className="text-xs text-gray-slate dark:text-gray-400 hover:text-orange-dark dark:hover:text-orange"
                >
                  {copied ? 'Copied!' : 'Copy All'}
                </button>
              </div>
              <div className="space-y-2">
                {changes.type === 'modified' && (changes as any).changes.map((change: any) => (
                  <div key={change.key} className="border border-gray-light dark:border-gray-700 rounded-lg overflow-hidden">
                    <div className={`px-3 py-1 text-xs font-medium ${
                      change.type === 'added' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                      change.type === 'deleted' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' :
                      'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300'
                    }`}>
                      {change.key}
                      <span className="ml-2 font-normal opacity-75">
                        ({change.type})
                      </span>
                    </div>
                    <div className="p-3 bg-white dark:bg-gray-800">
                      {change.type !== 'added' && oldData && (
                        <div className="mb-1">
                          <span className="text-xs text-red-600 dark:text-red-400 font-medium">- </span>
                          <span className="text-xs font-mono text-red-800 dark:text-red-200">
                            {JSON.stringify(oldData[change.key])}
                          </span>
                        </div>
                      )}
                      {change.type !== 'deleted' && newData && (
                        <div>
                          <span className="text-xs text-green-600 dark:text-green-400 font-medium">+ </span>
                          <span className="text-xs font-mono text-green-800 dark:text-green-200">
                            {JSON.stringify(newData[change.key])}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {changes.type === 'added' && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <p className="text-sm font-medium text-green-800 dark:text-green-300 mb-2">New record created</p>
                    <pre className="text-xs font-mono text-green-700 dark:text-green-200">{formatJSON(newData)}</pre>
                  </div>
                )}
                {changes.type === 'deleted' && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-2">Record deleted</p>
                    <pre className="text-xs font-mono text-red-700 dark:text-red-200">{formatJSON(oldData)}</pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

