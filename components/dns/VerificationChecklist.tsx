'use client';

import { useState } from 'react';

interface VerificationChecklistProps {
  nameservers: string[];
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

export function VerificationChecklist({ nameservers }: VerificationChecklistProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = async (ns: string, index: number) => {
    try {
      await navigator.clipboard.writeText(ns);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      // fallback ignored
    }
  };

  return (
    <div className="space-y-4">
      {/* Instruction text at top */}
      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
        <div className="flex">
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div className="text-xs text-blue-800 dark:text-blue-200">
            <p className="font-medium mb-1">Update your nameservers at your registrar</p>
            <p>Point your domain to the nameservers listed below. This may take up to 48 hours to propagate.</p>
          </div>
        </div>
      </div>

      {/* Nameservers list */}
      <div>
        <h5 className="text-xs font-medium text-gray-slate dark:text-gray-400 mb-2">Nameservers</h5>
        <div className="flex flex-wrap gap-2">
          {nameservers.map((ns, index) => (
            <div
              key={index}
              className="inline-flex items-center gap-2 w-fit p-2 rounded-md bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10"
            >
              <span className="text-sm font-mono text-gray-800 dark:text-gray-200">{ns}</span>
              <button
                type="button"
                onClick={() => handleCopy(ns, index)}
                className="p-1 rounded text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                aria-label={`Copy ${ns}`}
              >
                {copiedIndex === index ? (
                  <CheckIcon className="w-4 h-4 text-green-600" />
                ) : (
                  <CopyIcon className="w-4 h-4" />
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
