'use client';

import { useEffect, useRef, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface DeleteZoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  zoneName: string;
  recordCount: number;
  confirmationInput: string;
  onConfirmationInputChange: (value: string) => void;
  isDeleting?: boolean;
}

export function DeleteZoneModal({
  isOpen,
  onClose,
  onConfirm,
  zoneName,
  recordCount,
  confirmationInput,
  onConfirmationInputChange,
  isDeleting = false,
}: DeleteZoneModalProps) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState('');
  const copyFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetCopyFeedback = () => {
    setCopied(false);
    setCopyError('');
    if (copyFeedbackTimerRef.current) {
      clearTimeout(copyFeedbackTimerRef.current);
      copyFeedbackTimerRef.current = null;
    }
  };

  useEffect(() => {
    if (!isOpen) {
      resetCopyFeedback();
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (copyFeedbackTimerRef.current) {
        clearTimeout(copyFeedbackTimerRef.current);
      }
    };
  }, []);

  const handleClose = () => {
    resetCopyFeedback();
    onClose();
  };

  const handleCopy = async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      setCopyError('Clipboard is unavailable. Copy the zone name manually.');
      return;
    }

    try {
      await navigator.clipboard.writeText(zoneName);
      setCopyError('');
      setCopied(true);
      if (copyFeedbackTimerRef.current) {
        clearTimeout(copyFeedbackTimerRef.current);
      }
      copyFeedbackTimerRef.current = setTimeout(() => {
        setCopied(false);
        copyFeedbackTimerRef.current = null;
      }, 1800);
    } catch {
      setCopyError('Could not copy the zone name. Copy it manually.');
      setCopied(false);
    }
  };

  const canDelete = confirmationInput === zoneName && !isDeleting;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canDelete) return;

    try {
      await onConfirm();
    } catch {
      // Parent handles delete errors and notifications.
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Delete Zone" size="small">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500/20">
              <svg className="h-4 w-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-text">Permanently Delete Zone</h3>
              <p className="mt-1 text-sm text-text-muted">
                This action <span className="font-semibold text-red-600 dark:text-red-500">cannot be undone</span>. Deleting{' '}
                <span className="font-semibold text-text">{zoneName}</span> will remove {recordCount} associated DNS record{recordCount === 1 ? '' : 's'}.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border/70 bg-surface-alt/20 p-3 dark:border-gray-700/70 dark:bg-gray-800/30">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Zone Name</p>
          <div className="mt-2">
            <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-md bg-gray-100 px-2.5 py-1 text-sm font-mono text-text dark:bg-gray-800 dark:text-accent">
              <span className="truncate">{zoneName}</span>
              <button
                type="button"
                onClick={() => void handleCopy()}
                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded border border-blue-electric/40 text-blue-electric transition-colors hover:bg-blue-electric/10 focus:outline-none focus:ring-2 focus:ring-blue-electric"
                aria-label="Copy zone name"
              >
                {copied ? (
                  <svg className="h-3.5 w-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
            </span>
          </div>
          {copyError ? (
            <p className="mt-2 text-xs text-red-600 dark:text-red-500">{copyError}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="delete-zone-confirmation" className="mb-2 block text-sm font-medium text-text">
            Type <span className="font-mono rounded bg-gray-100 px-2 py-0.5 text-text dark:bg-gray-800 dark:text-accent">{zoneName}</span> to confirm
          </label>
          <Input
            id="delete-zone-confirmation"
            type="text"
            value={confirmationInput}
            onChange={(e) => onConfirmationInputChange(e.target.value)}
            placeholder="Enter zone name exactly"
            autoFocus
            disabled={isDeleting}
            className="h-10"
          />
          {confirmationInput && confirmationInput !== zoneName ? (
            <p className="mt-2 text-xs text-red-600 dark:text-red-500">Zone name does not match</p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button type="button" variant="outline" className="h-10 w-full" onClick={handleClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" className="h-10 w-full" disabled={!canDelete}>
            {isDeleting ? 'Deleting...' : 'Delete Zone'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
