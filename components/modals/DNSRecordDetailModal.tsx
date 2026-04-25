'use client';

import { useEffect, useId, useState, type ReactNode } from 'react';
import { Modal } from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { Tooltip } from '@/components/ui/Tooltip';
import type { DNSRecord } from '@/types/dns';
import { RECORD_TYPE_INFO } from '@/types/dns';
import { getFQDN } from '@/lib/utils/dns-validation';
import { formatDateWithRelative } from '@/lib/utils/time';

interface DNSRecordDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: DNSRecord | null;
  zoneName: string;
  onEdit: (record: DNSRecord) => void;
  onDelete: (record: DNSRecord) => void;
}

function formatTTLHint(ttlSeconds: number): string {
  const units = [
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 },
  ];

  for (const unit of units) {
    if (ttlSeconds >= unit.seconds) {
      const amount = Math.round(ttlSeconds / unit.seconds);
      return `~${amount} ${unit.label}${amount === 1 ? '' : 's'}`;
    }
  }

  return `~${ttlSeconds} second${ttlSeconds === 1 ? '' : 's'}`;
}

export function DNSRecordDetailModal({
  isOpen,
  onClose,
  record,
  zoneName,
  onEdit,
  onDelete,
}: DNSRecordDetailModalProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [displayRecord, setDisplayRecord] = useState<DNSRecord | null>(null);
  const [isMetadataExpanded, setIsMetadataExpanded] = useState(false);
  const metadataSectionId = useId();

  // Keep record in state during closing animation
  // This prevents the component from unmounting before the animation completes
  useEffect(() => {
    if (record) {
      setDisplayRecord(record);
      setIsMetadataExpanded(false);
    }
  }, [record, isOpen]);

  if (!displayRecord) return null;

  const typeInfo = RECORD_TYPE_INFO[displayRecord.type];
  const fqdn = getFQDN(displayRecord.name, zoneName);
  const createdDate = formatDateWithRelative(displayRecord.created_at);
  const updatedDate = formatDateWithRelative(displayRecord.updated_at);
  const displayName = displayRecord.name || '@';
  const ttlHint = formatTTLHint(displayRecord.ttl);
  
  // Determine if we should show zone name suffix for this record type
  const showZoneSuffix = ['CNAME', 'MX', 'NS', 'SRV', 'PTR'].includes(displayRecord.type) &&
                         !displayRecord.value.endsWith('.');

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // clipboard unavailable - ignore copy feedback
    }
  };

  const CopyButton = ({ text, label }: { text: string; label: string }) => (
    <button
      type="button"
      onClick={() => void handleCopy(text, label)}
      className="p-1.5 hover:bg-surface-hover rounded transition-colors group border border-transparent hover:border-gray-200 dark:hover:border-gray-600"
      aria-label={`Copy ${label}`}
    >
      {copied === label ? (
        <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )}
    </button>
  );

  interface DetailRowProps {
    label: string;
    children: ReactNode;
    helper?: ReactNode;
    copyText?: string;
    copyLabel?: string;
  }

  const DetailRow = ({ label, children, helper, copyText, copyLabel }: DetailRowProps) => (
    <div className="rounded-lg border border-border bg-surface/60 dark:bg-gray-900/40 p-3">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {label}
          </p>
          <div className="mt-1.5">{children}</div>
          {helper ? (
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {helper}
            </div>
          ) : null}
        </div>
        {copyText && copyLabel ? <CopyButton text={copyText} label={copyLabel} /> : null}
      </div>
    </div>
  );

  const valueCodeClassName =
    displayRecord.type === 'TXT'
      ? 'text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words'
      : 'text-sm text-gray-900 dark:text-gray-100 break-all';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="DNS Record Details"
      size="large"
    >
      <div className="space-y-5">
        {/* Summary Header */}
        <div className="rounded-xl border border-border bg-gray-50/80 dark:bg-gray-800/60 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3 min-w-0">
              <span className="px-3 py-1.5 bg-blue-electric/10 dark:bg-blue-electric/20 text-blue-electric rounded-lg text-sm font-semibold flex-shrink-0">
                {displayRecord.type}
              </span>
              <div className="min-w-0">
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 break-all">
                  {displayName}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 break-all mt-0.5">
                  {fqdn}
                </p>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 sm:text-right">
              {typeInfo.description}
            </p>
          </div>
        </div>

        {/* Primary Details */}
        <div className="rounded-xl border border-border bg-gray-50/80 dark:bg-gray-800/60 p-4 sm:p-5 space-y-3">
          <DetailRow
            label="Name"
            copyText={displayName}
            copyLabel="name"
            helper={
              <>
                FQDN:{' '}
                <span className="font-mono break-all text-gray-600 dark:text-gray-300">
                  {fqdn}
                </span>
              </>
            }
          >
            <span className="text-sm font-mono text-gray-900 dark:text-gray-100 break-all">
              {displayName}
            </span>
          </DetailRow>

          <DetailRow
            label="Value"
            copyText={displayRecord.value}
            copyLabel="value"
          >
            <div className="rounded-md border border-border bg-surface px-3 py-2">
              <code className={valueCodeClassName}>
                {displayRecord.value}
                {showZoneSuffix ? (
                  <span className="text-gray-500 dark:text-gray-400">.{zoneName}.</span>
                ) : null}
              </code>
            </div>
          </DetailRow>

          <DetailRow
            label="TTL (Time to Live)"
            copyText={displayRecord.ttl.toString()}
            copyLabel="ttl"
            helper={ttlHint}
          >
            <span className="text-sm text-gray-900 dark:text-gray-100">
              {displayRecord.ttl} seconds
            </span>
          </DetailRow>

          {displayRecord.comment ? (
            <DetailRow label="Comment">
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                {displayRecord.comment}
              </p>
            </DetailRow>
          ) : null}
        </div>

        {/* Technical Metadata (Collapsed by Default) */}
        <div className="rounded-xl border border-border bg-gray-50/80 dark:bg-gray-800/60 p-4 sm:p-5">
          <button
            type="button"
            className="w-full flex items-center justify-between text-left"
            onClick={() => setIsMetadataExpanded((prev) => !prev)}
            aria-expanded={isMetadataExpanded}
            aria-controls={metadataSectionId}
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
              Technical Metadata
            </span>
            <svg
              className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
                isMetadataExpanded ? 'rotate-180' : 'rotate-0'
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <div
            id={metadataSectionId}
            data-testid="technical-metadata-content"
            data-state={isMetadataExpanded ? 'open' : 'closed'}
            aria-hidden={!isMetadataExpanded}
            className={`overflow-hidden transition-all duration-200 ease-out ${
              isMetadataExpanded
                ? 'max-h-96 opacity-100 translate-y-0 mt-3'
                : 'max-h-0 opacity-0 -translate-y-1 pointer-events-none'
            }`}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Record ID:</span>
                <div className="font-mono text-xs text-gray-900 dark:text-gray-100 break-all mt-1">
                  {displayRecord.id}
                </div>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Zone ID:</span>
                <div className="font-mono text-xs text-gray-900 dark:text-gray-100 break-all mt-1">
                  {displayRecord.zone_id}
                </div>
              </div>
              <div>
                <Tooltip content={createdDate.absolute}>
                  <span className="text-gray-500 dark:text-gray-400">Created:</span>
                </Tooltip>
                <div className="text-gray-900 dark:text-gray-100 mt-1">
                  {createdDate.relative}
                </div>
              </div>
              <div>
                <Tooltip content={updatedDate.absolute}>
                  <span className="text-gray-500 dark:text-gray-400">Last Updated:</span>
                </Tooltip>
                <div className="text-gray-900 dark:text-gray-100 mt-1">
                  {updatedDate.relative}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-3">
          <div className="grid grid-cols-1 gap-2 sm:flex sm:items-center sm:justify-end sm:gap-2">
            <Button
              variant="primary"
              onClick={() => {
                onEdit(displayRecord);
                onClose();
              }}
              className="w-full sm:w-auto h-11"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                onDelete(displayRecord);
                onClose();
              }}
              className="w-full sm:w-auto h-11 !border-red-600 !text-red-600 hover:!bg-red-50 dark:hover:!bg-red-900/20"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
