'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { Modal } from '@/components/ui/Modal';
import { getChangedFields, formatTimestamp } from '@/lib/utils/audit-formatting';

interface DiffViewerProps {
  oldData: any;
  newData: any;
  tableName?: string;
  onClose: () => void;
  isOpen?: boolean;
}

type CopiedSide = 'before' | 'after' | null;

export function DiffViewer({ oldData, newData, tableName = 'zone_records', onClose, isOpen = true }: DiffViewerProps) {
  const [mode, setMode] = useState<'formatted' | 'raw'>('formatted');
  const [copiedSide, setCopiedSide] = useState<CopiedSide>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);

  const copyResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const contentContainerRef = useRef<HTMLDivElement | null>(null);
  const pendingViewportStartHeightRef = useRef<number | null>(null);

  // Preserve data during close animation.
  const preservedDataRef = useRef({ oldData: null as any, newData: null as any, tableName });

  useEffect(() => {
    if (oldData || newData) {
      preservedDataRef.current = { oldData, newData, tableName };
    }
  }, [oldData, newData, tableName]);

  useLayoutEffect(() => {
    if (isOpen) {
      setMode('formatted');
      setCopiedSide(null);
      setCopyError(null);
      setViewportHeight(null);
      pendingViewportStartHeightRef.current = null;
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (copyResetTimerRef.current) {
        clearTimeout(copyResetTimerRef.current);
      }
    };
  }, []);

  const hasLiveData = Boolean(oldData || newData);
  const displayOldData = hasLiveData ? oldData : preservedDataRef.current.oldData;
  const displayNewData = hasLiveData ? newData : preservedDataRef.current.newData;
  const displayTableName = hasLiveData ? tableName : preservedDataRef.current.tableName;

  const formatJSON = (data: any) => {
    if (!data) return 'null';
    return JSON.stringify(data, null, 2);
  };

  const handleCopy = async (text: string, side: Exclude<CopiedSide, null>) => {
    if (!navigator?.clipboard?.writeText) {
      setCopyError('Clipboard is unavailable. Copy the JSON manually.');
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopyError(null);
      setCopiedSide(side);
      if (copyResetTimerRef.current) {
        clearTimeout(copyResetTimerRef.current);
      }
      copyResetTimerRef.current = setTimeout(() => {
        setCopiedSide(null);
        copyResetTimerRef.current = null;
      }, 1800);
    } catch {
      setCopyError('Could not copy JSON. Please copy it manually.');
    }
  };

  const changedFields = getChangedFields(displayOldData, displayNewData, displayTableName);
  const changeType = !displayOldData && displayNewData ? 'created' : displayOldData && !displayNewData ? 'deleted' : 'updated';

  const getEntityName = (sourceTableName: string) => {
    switch (sourceTableName) {
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
  const changeTypeMessage =
    changeType === 'created'
      ? `New ${entityName} created`
      : changeType === 'deleted'
        ? `${entityName.charAt(0).toUpperCase() + entityName.slice(1)} deleted`
        : `${changedFields.length} field(s) changed`;

  const handleModeChange = (nextMode: 'formatted' | 'raw') => {
    if (nextMode === mode) return;
    if (viewportRef.current) {
      pendingViewportStartHeightRef.current = viewportRef.current.offsetHeight;
    }
    setCopyError(null);
    setMode(nextMode);
  };

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const container = contentContainerRef.current;

    if (!viewport || !container || !isOpen) return;

    const maxViewportHeight = typeof window === 'undefined' ? 520 : Math.min(Math.round(window.innerHeight * 0.6), 520);
    const measuredContentHeight = Math.ceil(container.scrollHeight);
    const desiredHeight = Math.min(measuredContentHeight, maxViewportHeight);
    const startHeight = pendingViewportStartHeightRef.current ?? viewport.offsetHeight;
    const shouldAnimateHeight = pendingViewportStartHeightRef.current !== null && Math.abs(desiredHeight - startHeight) > 1;

    setViewportHeight(desiredHeight);
    gsap.killTweensOf(viewport);

    if (shouldAnimateHeight) {
      gsap.set(viewport, { height: startHeight });
      gsap.to(viewport, {
        height: desiredHeight,
        duration: 0.22,
        ease: 'power2.out',
      });
    } else {
      gsap.set(viewport, { height: desiredHeight });
    }

    pendingViewportStartHeightRef.current = null;

    gsap.killTweensOf(container);
    gsap.set(container, { opacity: 0, y: 8 });
    gsap.to(container, {
      opacity: 1,
      y: 0,
      duration: 0.2,
      ease: 'power2.out',
      onComplete: () => {
        gsap.set(container, { clearProps: 'opacity,transform' });
      },
    });
  }, [mode, isOpen, displayOldData, displayNewData, displayTableName]);

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;

    const handleResize = () => {
      const maxViewportHeight = Math.min(Math.round(window.innerHeight * 0.6), 520);
      const viewport = viewportRef.current;
      const container = contentContainerRef.current;
      if (!viewport || !container) return;

      const desiredHeight = Math.min(Math.ceil(container.scrollHeight), maxViewportHeight);
      const currentHeight = viewport.offsetHeight;
      setViewportHeight(desiredHeight);
      gsap.killTweensOf(viewport);
      pendingViewportStartHeightRef.current = null;
      if (Math.abs(desiredHeight - currentHeight) > 1) {
        gsap.set(viewport, { height: currentHeight });
        gsap.to(viewport, {
          height: desiredHeight,
          duration: 0.2,
          ease: 'power2.out',
        });
      } else {
        gsap.set(viewport, { height: desiredHeight });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Change Diff" subtitle={changeTypeMessage} size="large">
      <div className="mb-4 flex items-center justify-end">
        <div className="inline-flex items-center rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
          <button
            type="button"
            onClick={() => handleModeChange('formatted')}
            className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
              mode === 'formatted'
                ? 'bg-white text-orange-dark shadow-sm dark:bg-gray-700 dark:text-orange'
                : 'text-gray-slate hover:text-orange-dark dark:text-gray-400 dark:hover:text-orange'
            }`}
          >
            Formatted
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('raw')}
            className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
              mode === 'raw'
                ? 'bg-white text-orange-dark shadow-sm dark:bg-gray-700 dark:text-orange'
                : 'text-gray-slate hover:text-orange-dark dark:text-gray-400 dark:hover:text-orange'
            }`}
          >
            Raw JSON
          </button>
        </div>
      </div>

      <div ref={viewportRef} className="max-h-[60vh] overflow-y-auto pr-1" style={viewportHeight ? { height: `${viewportHeight}px` } : undefined}>
        <div ref={contentContainerRef}>
          {mode === 'formatted' ? (
            <div className="space-y-4">
              <div className="space-y-3">
                {changedFields.length === 0 ? (
                  <div className="rounded-lg border border-gray-light/70 bg-gray-50 py-8 text-center text-gray-slate dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-400">
                    No changes detected
                  </div>
                ) : (
                  changedFields.map((change) => (
                    <div key={change.field} className="rounded-lg border border-gray-light/70 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
                      <div className="mb-3 flex items-center">
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100">{change.fieldName}</h4>
                        {changeType === 'updated' && (
                          <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                            Modified
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div>
                          <div className="mb-1 text-xs font-medium text-red-600 dark:text-red-400">Before</div>
                          <div className="flex min-h-[2.5rem] items-center rounded border border-red-200 bg-red-50 px-3 py-2 dark:border-red-800 dark:bg-red-900/20">
                            <span className="break-all text-sm text-red-900 dark:text-red-100">{change.oldFormatted}</span>
                          </div>
                        </div>
                        <div>
                          <div className="mb-1 text-xs font-medium text-green-600 dark:text-green-400">After</div>
                          <div className="flex min-h-[2.5rem] items-center rounded border border-green-200 bg-green-50 px-3 py-2 dark:border-green-800 dark:bg-green-900/20">
                            <span className="break-all text-sm text-green-900 dark:text-green-100">{change.newFormatted}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {(displayOldData?.updated_at || displayNewData?.updated_at) && (
                <div className="pt-1">
                  <p className="text-xs text-gray-slate dark:text-gray-400">
                    Last updated: {formatTimestamp(displayNewData?.updated_at || displayOldData?.updated_at)}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {copyError ? <p className="text-xs text-red-600 dark:text-red-500">{copyError}</p> : null}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-red-600 dark:text-red-400">Before</h3>
                    {displayOldData && (
                      <button
                        type="button"
                        onClick={() => void handleCopy(formatJSON(displayOldData), 'before')}
                        className="text-xs text-gray-slate transition-colors hover:text-orange-dark dark:text-gray-400 dark:hover:text-orange"
                        aria-label="Copy before JSON"
                        data-testid="copy-before-json"
                      >
                        {copiedSide === 'before' ? 'Copied!' : 'Copy'}
                      </button>
                    )}
                  </div>
                  <pre
                    data-testid="raw-before-json"
                    className="overflow-x-auto rounded-lg border border-red-200 bg-red-50 p-4 font-mono text-xs text-gray-900 dark:border-red-800 dark:bg-red-900/20 dark:text-gray-100"
                  >
                    {formatJSON(displayOldData)}
                  </pre>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-green-600 dark:text-green-400">After</h3>
                    {displayNewData && (
                      <button
                        type="button"
                        onClick={() => void handleCopy(formatJSON(displayNewData), 'after')}
                        className="text-xs text-gray-slate transition-colors hover:text-orange-dark dark:text-gray-400 dark:hover:text-orange"
                        aria-label="Copy after JSON"
                        data-testid="copy-after-json"
                      >
                        {copiedSide === 'after' ? 'Copied!' : 'Copy'}
                      </button>
                    )}
                  </div>
                  <pre
                    data-testid="raw-after-json"
                    className="overflow-x-auto rounded-lg border border-green-200 bg-green-50 p-4 font-mono text-xs text-gray-900 dark:border-green-800 dark:bg-green-900/20 dark:text-gray-100"
                  >
                    {formatJSON(displayNewData)}
                  </pre>
                </div>
              </div>

              {(displayOldData?.updated_at || displayNewData?.updated_at) && (
                <div className="pt-1">
                  <p className="text-xs text-gray-slate dark:text-gray-400">
                    Last updated: {formatTimestamp(displayNewData?.updated_at || displayOldData?.updated_at)}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
