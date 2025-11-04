'use client';

import { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { Modal } from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Dropdown from '@/components/ui/Dropdown';
import type { DNSRecord, DNSRecordType, DNSRecordFormData } from '@/types/dns';
import { RECORD_TYPE_INFO, TTL_PRESETS } from '@/types/dns';
import { validateDNSRecord, getFQDN } from '@/lib/utils/dns-validation';

interface ManageDNSRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: DNSRecordFormData) => Promise<void>;
  mode: 'add' | 'edit';
  record?: DNSRecord;
  zoneName: string;
  existingRecords: DNSRecord[];
}

const recordTypeOptions = [
  { value: 'A', label: 'A - IPv4 Address' },
  { value: 'AAAA', label: 'AAAA - IPv6 Address' },
  { value: 'CNAME', label: 'CNAME - Canonical Name' },
  { value: 'MX', label: 'MX - Mail Exchange' },
  { value: 'NS', label: 'NS - Name Server' },
  { value: 'TXT', label: 'TXT - Text Record' },
  { value: 'SRV', label: 'SRV - Service Record' },
  { value: 'CAA', label: 'CAA - Certificate Authority Authorization' },
];

export function ManageDNSRecordModal({
  isOpen,
  onClose,
  onSubmit,
  mode,
  record,
  zoneName,
  existingRecords,
}: ManageDNSRecordModalProps) {
  const [formData, setFormData] = useState<DNSRecordFormData>({
    name: '',
    type: 'A',
    value: '',
    ttl: 3600,
    priority: undefined,
    active: true,
    comment: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [warnings, setWarnings] = useState<string[]>([]);
  const [customTTL, setCustomTTL] = useState(false);

  // Initialize form data when modal opens or record changes
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && record) {
        setFormData({
          name: record.name,
          type: record.type,
          value: record.value,
          ttl: record.ttl,
          priority: record.priority ?? undefined,
          active: record.active,
          comment: record.comment ?? '',
        });
        // Check if TTL is custom
        const isPreset = TTL_PRESETS.some(p => p.value === record.ttl);
        setCustomTTL(!isPreset);
      } else {
        // Reset for add mode
        setFormData({
          name: '',
          type: 'A',
          value: '',
          ttl: 3600,
          priority: undefined,
          active: true,
          comment: '',
        });
        setCustomTTL(false);
      }
      setErrors({});
      setWarnings([]);
    }
  }, [isOpen, mode, record]);

  // Real-time validation
  useEffect(() => {
    if (!isOpen) return;
    
    const validation = validateDNSRecord(
      formData,
      existingRecords,
      record?.id
    );
    
    setErrors(validation.errors);
    setWarnings(validation.warnings);
  }, [formData, existingRecords, record?.id, isOpen]);

  const handleTypeChange = (type: DNSRecordType) => {
    const typeInfo = RECORD_TYPE_INFO[type];
    setFormData(prev => ({
      ...prev,
      type,
      ttl: typeInfo.defaultTTL,
      priority: typeInfo.requiresPriority ? (prev.priority || 10) : undefined,
    }));
  };

  const handleTTLChange = (value: string) => {
    if (value === 'custom') {
      setCustomTTL(true);
    } else {
      setCustomTTL(false);
      setFormData(prev => ({ ...prev, ttl: parseInt(value, 10) }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Final validation
    const validation = validateDNSRecord(
      formData,
      existingRecords,
      record?.id
    );
    
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setIsSubmitting(true);
    
    try {
      await onSubmit(formData);
      onClose();
    } catch (error: any) {
      setErrors({ general: error.message || 'Failed to save record' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const typeInfo = RECORD_TYPE_INFO[formData.type];
  const fqdn = getFQDN(formData.name, zoneName);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'add' ? 'Add DNS Record' : 'Edit DNS Record'}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* General Error */}
        {errors.general && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
            <p className="text-sm text-red-800 dark:text-red-400">{errors.general}</p>
          </div>
        )}

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3">
            <ul className="text-sm text-yellow-800 dark:text-yellow-400 space-y-1">
              {warnings.map((warning, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {warning}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Record Type */}
          <div className="md:col-span-2">
            <Dropdown
              label="Record Type"
              options={recordTypeOptions}
              value={formData.type}
              onChange={(value) => handleTypeChange(value as DNSRecordType)}
              disabled={mode === 'edit'} // Don't allow changing type on edit
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {typeInfo.description}
            </p>
          </div>

          {/* Record Name */}
          <div>
            <Input
              label="Name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              error={errors.name}
              placeholder="@ or subdomain"
              hint={`FQDN: ${fqdn}`}
            />
          </div>

          {/* TTL */}
          <div>
            {!customTTL ? (
              <Dropdown
                label="TTL (Time to Live)"
                options={[
                  ...TTL_PRESETS.map(p => ({ value: p.value.toString(), label: `${p.value}s (${p.label})` })),
                  { value: 'custom', label: 'Custom...' },
                ]}
                value={formData.ttl.toString()}
                onChange={handleTTLChange}
                error={errors.ttl}
              />
            ) : (
              <div>
                <Input
                  label="TTL (seconds)"
                  type="number"
                  value={formData.ttl}
                  onChange={(e) => setFormData(prev => ({ ...prev, ttl: parseInt(e.target.value, 10) || 60 }))}
                  error={errors.ttl}
                  min={60}
                  max={604800}
                />
                <button
                  type="button"
                  onClick={() => {
                    setCustomTTL(false);
                    setFormData(prev => ({ ...prev, ttl: 3600 }));
                  }}
                  className="mt-1 text-xs text-orange hover:text-orange-dark transition-colors"
                >
                  Use preset values
                </button>
              </div>
            )}
          </div>

          {/* Priority (for MX and SRV) */}
          {typeInfo.requiresPriority && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Priority <span className="text-red-500">*</span>
              </label>
              <div className="space-y-3">
                {/* Quick Select Buttons */}
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400 self-center mr-2">Quick select:</span>
                  {[10, 20, 30, 40, 50].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, priority: val }))}
                      className={clsx(
                        "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                        formData.priority === val
                          ? "bg-orange text-white"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-orange/20 dark:hover:bg-orange/20"
                      )}
                    >
                      {val}
                    </button>
                  ))}
                </div>
                
                {/* Input Field */}
                <Input
                  type="number"
                  value={formData.priority ?? ''}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setFormData(prev => ({ 
                      ...prev, 
                      priority: isNaN(val) ? undefined : Math.max(0, Math.min(65535, val))
                    }));
                  }}
                  error={errors.priority}
                  placeholder="10"
                  min={0}
                  max={65535}
                />
                
                {/* Helper Text */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
                  <p className="text-xs text-blue-800 dark:text-blue-400 font-medium mb-1">
                    Best Practices for {formData.type} Records:
                  </p>
                  <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
                    <li>Lower numbers = higher priority (0 is highest)</li>
                    <li>Use increments of 10 (10, 20, 30) for flexibility</li>
                    {formData.type === 'MX' && (
                      <>
                        <li>Primary mail server: 10, Backup: 20, 30...</li>
                        <li>Same priority = automatic load balancing</li>
                      </>
                    )}
                    {formData.type === 'SRV' && (
                      <>
                        <li>Use weight field to distribute load at same priority</li>
                        <li>Example: Primary (10), Secondary (20), Backup (30)</li>
                      </>
                    )}
                    <li>Valid range: 0-65535</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Value */}
          <div className="md:col-span-2">
            <Input
              label="Value"
              type="text"
              value={formData.value}
              onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
              error={errors.value}
              placeholder={typeInfo.placeholder}
              hint={typeInfo.hint}
            />
          </div>

          {/* Active Toggle */}
          <div className="md:col-span-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.active}
                onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                className="w-4 h-4 text-orange bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded focus:ring-orange focus:ring-2 cursor-pointer"
              />
              <div>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Active
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Inactive records are not published in DNS responses
                </p>
              </div>
            </label>
          </div>

          {/* Comment */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Comment (Optional)
            </label>
            <textarea
              value={formData.comment}
              onChange={(e) => setFormData(prev => ({ ...prev, comment: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 border border-gray-light dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange transition-colors"
              placeholder="Add a note about this record..."
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-light dark:border-gray-700">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !validateDNSRecord(formData, existingRecords, record?.id).valid}
            loading={isSubmitting}
          >
            {mode === 'add' ? 'Create Record' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

