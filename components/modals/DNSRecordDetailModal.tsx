'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { Tooltip } from '@/components/ui/Tooltip';
import { TagBadge } from '@/components/ui/TagBadge';
import type { DNSRecord } from '@/types/dns';
import { RECORD_TYPE_INFO } from '@/types/dns';
import { getFQDN } from '@/lib/utils/dns-validation';
import { formatDateWithRelative } from '@/lib/utils/time';
import type { Tag } from '@/lib/mock-tags-data';

interface DNSRecordDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: DNSRecord | null;
  zoneName: string;
  onEdit: (record: DNSRecord) => void;
  onDelete: (record: DNSRecord) => void;
  // Optional tag props for mockup
  recordTags?: Tag[];
  onAssignTags?: (recordId: string, recordName: string) => void;
}

export function DNSRecordDetailModal({
  isOpen,
  onClose,
  record,
  zoneName,
  onEdit,
  onDelete,
  recordTags = [],
  onAssignTags,
}: DNSRecordDetailModalProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [displayRecord, setDisplayRecord] = useState<DNSRecord | null>(null);

  // Keep record in state during closing animation
  // This prevents the component from unmounting before the animation completes
  useEffect(() => {
    if (record) {
      setDisplayRecord(record);
    }
  }, [record]);

  if (!displayRecord) return null;

  const typeInfo = RECORD_TYPE_INFO[displayRecord.type];
  const fqdn = getFQDN(displayRecord.name, zoneName);
  const createdDate = formatDateWithRelative(displayRecord.created_at);
  const updatedDate = formatDateWithRelative(displayRecord.updated_at);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const CopyButton = ({ text, label }: { text: string; label: string }) => (
    <button
      onClick={() => handleCopy(text, label)}
      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors group"
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="DNS Record Details"
      size="large"
    >
      <div className="space-y-6">
        {/* Header with Type Badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1.5 bg-blue-electric/10 dark:bg-blue-electric/20 text-blue-electric dark:text-blue-electric rounded-lg text-sm font-semibold">
              {displayRecord.type}
            </span>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {typeInfo.description}
          </div>
        </div>

        {/* Record Information */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Name
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono text-gray-900 dark:text-gray-100">
                {displayRecord.name || '@'}
              </span>
              <CopyButton text={displayRecord.name || '@'} label="name" />
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              FQDN: {fqdn}
            </div>
          </div>

          {/* Value */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Value
            </label>
            <div className="flex items-start gap-2">
              <div className="flex-1 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 p-3">
                <code className="text-sm text-gray-900 dark:text-gray-100 break-all">
                  {displayRecord.value}
                </code>
              </div>
              <CopyButton text={displayRecord.value} label="value" />
            </div>
          </div>

          {/* TTL and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                TTL (Time to Live)
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-900 dark:text-gray-100">
                  {displayRecord.ttl} seconds
                </span>
                <CopyButton text={displayRecord.ttl.toString()} label="ttl" />
              </div>
            </div>

          </div>

          {/* Comment */}
          {displayRecord.comment && (
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Comment
              </label>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {displayRecord.comment}
              </p>
            </div>
          )}
        </div>

        {/* Tags Section */}
        <div className="border-t border-gray-light dark:border-gray-700 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Tags
            </h4>
            {onAssignTags && (
              <button
                onClick={() => onAssignTags(displayRecord.id, displayRecord.name)}
                className="text-xs text-orange hover:text-orange-dark flex items-center gap-1 transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Manage Tags
              </button>
            )}
          </div>
          {recordTags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {recordTags.map((tag) => (
                <TagBadge key={tag.id} name={tag.name} color={tag.color} size="md" />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic">
              No tags assigned
              {onAssignTags && (
                <button
                  onClick={() => onAssignTags(displayRecord.id, displayRecord.name)}
                  className="ml-2 text-orange hover:text-orange-dark transition-colors"
                >
                  Add tags
                </button>
              )}
            </p>
          )}
        </div>

        {/* Metadata */}
        <div className="border-t border-gray-light dark:border-gray-700 pt-4">
          <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3">
            Metadata
          </h4>
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

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t border-gray-light dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => {
                onEdit(displayRecord);
                onClose();
              }}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </Button>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              onDelete(displayRecord);
              onClose();
            }}
            className="!border-red-600 !text-red-600 hover:!bg-red-50 dark:hover:!bg-red-900/20"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </Button>
        </div>
      </div>
    </Modal>
  );
}

