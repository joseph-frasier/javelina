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

  const showZoneSuffix = ['CNAME', 'MX', 'NS', 'SRV', 'PTR'].includes(displayRecord.type) &&
                         !displayRecord.value.endsWith('.');

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // clipboard unavailable
    }
  };

  const CopyButton = ({ text, label }: { text: string; label: string }) => (
    <button
      type="button"
      onClick={() => void handleCopy(text, label)}
      className="p-1.5 hover:bg-surface-hover rounded transition-colors group border border-transparent hover:border-border"
      aria-label={`Copy ${label}`}
    >
      {copied === label ? (
        <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg className="w-4 h-4 text-text-muted group-hover:text-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    <div className="py-3">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-1.5">
            {label}
          </p>
          <div>{children}</div>
          {helper ? (
            <div className="mt-1 text-xs text-text-muted">{helper}</div>
          ) : null}
        </div>
        {copyText && copyLabel ? <CopyButton text={copyText} label={copyLabel} /> : null}
      </div>
    </div>
  );

  const valueCodeClassName =
    displayRecord.type === 'TXT'
      ? 'text-base text-text whitespace-pre-wrap break-words'
      : 'text-base text-text break-all';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="DNS Record Details"
      size="large"
    >
      <div className="space-y-4">
        {/* Summary Header */}
        <div className="rounded-xl border border-border bg-surface-alt p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3 min-w-0">
              <span className="px-2.5 py-1 bg-white dark:bg-gray-700 border border-border-strong dark:border-gray-600 text-text rounded text-sm font-semibold flex-shrink-0">
                {displayRecord.type}
              </span>
              <div className="min-w-0">
                <p className="text-lg font-semibold text-text break-all">
                  {displayName}
                </p>
                <p className="text-sm text-text-muted break-all mt-0.5">
                  {fqdn}
                </p>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-text-muted sm:text-right flex-shrink-0">
              {typeInfo.description}
            </p>
          </div>
        </div>

        {/* Primary Details */}
        <div className="rounded-xl border border-border px-4 sm:px-5">
          <DetailRow
            label="Name"
            copyText={displayName}
            copyLabel="name"
            helper={
              <>
                FQDN:{' '}
                <span className="font-mono break-all">{fqdn}</span>
              </>
            }
          >
            <span className="text-base font-mono text-text break-all">{displayName}</span>
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
                  <span className="text-text-muted">.{zoneName}.</span>
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
            <span className="text-base text-text">{displayRecord.ttl} seconds</span>
          </DetailRow>

          {displayRecord.comment ? (
            <DetailRow label="Comment" last>
              <p className="text-sm text-text whitespace-pre-wrap break-words">
                {displayRecord.comment}
              </p>
            </DetailRow>
          ) : null}
        </div>

        {/* Technical Metadata */}
        <div className="rounded-xl border border-border px-4 sm:px-5">
          <button
            type="button"
            className="w-full flex items-center justify-between text-left py-3"
            onClick={() => setIsMetadataExpanded((prev) => !prev)}
            aria-expanded={isMetadataExpanded}
            aria-controls={metadataSectionId}
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Technical Metadata
            </span>
            <svg
              className={`w-4 h-4 text-text-muted transition-transform duration-200 ${isMetadataExpanded ? 'rotate-180' : 'rotate-0'}`}
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
                ? 'max-h-96 opacity-100 translate-y-0 pb-4'
                : 'max-h-0 opacity-0 -translate-y-1 pointer-events-none'
            }`}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-text-muted text-xs">Record ID</span>
                <div className="font-mono text-sm text-text break-all mt-1">{displayRecord.id}</div>
              </div>
              <div>
                <span className="text-text-muted text-xs">Zone ID</span>
                <div className="font-mono text-sm text-text break-all mt-1">{displayRecord.zone_id}</div>
              </div>
              <div>
                <Tooltip content={createdDate.absolute}>
                  <span className="text-text-muted text-xs">Created</span>
                </Tooltip>
                <div className="text-sm text-text mt-1">{createdDate.relative}</div>
              </div>
              <div>
                <Tooltip content={updatedDate.absolute}>
                  <span className="text-text-muted text-xs">Last Updated</span>
                </Tooltip>
                <div className="text-sm text-text mt-1">{updatedDate.relative}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 pt-1">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <Button
              variant="outline"
              onClick={() => { onDelete(displayRecord); onClose(); }}
              className="h-10 !border-red-600 !text-red-600 hover:!bg-red-50 dark:hover:!bg-red-900/20"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </Button>
            <Button
              variant="primary"
              onClick={() => { onEdit(displayRecord); onClose(); }}
              className="h-10"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
