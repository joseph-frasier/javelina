'use client';

import { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { Modal } from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Dropdown from '@/components/ui/Dropdown';
import type { DNSRecord, DNSRecordType, DNSRecordFormData } from '@/types/dns';
import { RECORD_TYPE_INFO, TTL_PRESETS } from '@/types/dns';
import { validateDNSRecord, getFQDN, getReverseZoneType } from '@/lib/utils/dns-validation';

interface ManageDNSRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: DNSRecordFormData) => Promise<void>;
  mode: 'add' | 'edit';
  record?: DNSRecord;
  zoneName: string;
  existingRecords: DNSRecord[];
}

// All possible record types (SOA is intentionally excluded - it should only be edited, not manually created)
const allRecordTypeOptions = [
  { value: 'A', label: 'A - IPv4 Address', disabled: false },
  { value: 'AAAA', label: 'AAAA - IPv6 Address', disabled: false },
  { value: 'CNAME', label: 'CNAME - Canonical Name', disabled: false },
  { value: 'MX', label: 'MX - Mail Exchange', disabled: false },
  { value: 'NS', label: 'NS - Name Server', disabled: false },
  { value: 'TXT', label: 'TXT - Text Record', disabled: false },
  { value: 'SRV', label: 'SRV - Service Record', disabled: false },
  { value: 'CAA', label: 'CAA - Certificate Authority Authorization', disabled: false },
  { value: 'PTR', label: 'PTR - Pointer Record (Reverse DNS)', disabled: false },
  { value: 'RFC3597', label: 'Generic (RFC 3597)', disabled: true },
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
  // All record types are now available for all zone types
  const recordTypeOptions = allRecordTypeOptions;
  const [formData, setFormData] = useState<DNSRecordFormData>({
    name: '',
    type: 'A',
    value: '',
    ttl: 3600,
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
          comment: record.comment ?? '',
        });
        
        // Check if TTL is custom
        const isPreset = TTL_PRESETS.some(p => p.value === record.ttl);
        setCustomTTL(!isPreset);
      } else {
        // Reset for add mode - default to A record
        setFormData({
          name: '',
          type: 'A',
          value: '',
          ttl: 3600,
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
      record?.id,
      zoneName
    );
    
    setErrors(validation.errors);
    setWarnings(validation.warnings);
  }, [formData, existingRecords, record?.id, isOpen, zoneName]);

  const handleTypeChange = (type: DNSRecordType) => {
    const typeInfo = RECORD_TYPE_INFO[type];
    setFormData(prev => ({
      ...prev,
      type,
      ttl: typeInfo.defaultTTL,
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

  // Get appropriate placeholder for Name field based on record type and zone type
  const getNamePlaceholder = () => {
    if (formData.type === 'PTR') {
      return 'PTR record name (e.g. 1 or 10.0)';
    }
    if (formData.type === 'CNAME') {
      return 'Subdomain (e.g., www, blog, api)';
    }
    if (formData.type === 'NS') {
      return 'Subdomain (e.g., dev, staging, prod)';
    }
    return '@ (root) or subdomain (e.g., www, blog, mail)';
  };

  const typeInfo = RECORD_TYPE_INFO[formData.type];
  const fqdn = getFQDN(formData.name, zoneName);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'add' ? 'Add DNS Record' : 'Edit DNS Record'}
      size="xlarge"
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Record Type - Visual Selection */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Record Type
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {recordTypeOptions.map((option) => {
                const isSelected = formData.type === option.value;
                const info = RECORD_TYPE_INFO[option.value as DNSRecordType] || {
                  description: 'Generic/Unknown record type',
                  label: option.value,
                  requiresPriority: false,
                  defaultTTL: 3600,
                  placeholder: '',
                  hint: ''
                };
                
                // SVG Icons for each record type
                const getIcon = () => {
                  const iconClass = clsx(
                    'w-5 h-5 mb-1 transition-all',
                    isSelected ? 'text-orange' : 'text-gray-500 dark:text-gray-400'
                  );
                  
                  switch(option.value) {
                    case 'A':
                      return (
                        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      );
                    case 'AAAA':
                      return (
                        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      );
                    case 'CNAME':
                      return (
                        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                      );
                    case 'MX':
                      return (
                        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      );
                    case 'NS':
                      return (
                        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                        </svg>
                      );
                    case 'TXT':
                      return (
                        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      );
                    case 'SRV':
                      return (
                        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      );
                    case 'CAA':
                      return (
                        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      );
                    case 'PTR':
                      return (
                        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                      );
                    case 'RFC3597':
                      return (
                        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                        </svg>
                      );
                    default:
                      return null;
                  }
                };
                
                const isDisabled = option.disabled || false;
                
                const button = (
                  <button
                    type="button"
                    onClick={() => !isDisabled && handleTypeChange(option.value as DNSRecordType)}
                    disabled={isDisabled}
                    className={clsx(
                      'w-full flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all text-center relative',
                      isDisabled && 'cursor-not-allowed opacity-50 bg-gray-50 dark:bg-gray-800/50',
                      !isDisabled && isSelected && 'border-orange bg-orange/10 dark:bg-orange/20',
                      !isDisabled && !isSelected && 'border-gray-200 dark:border-gray-700 hover:border-orange/50 dark:hover:border-orange/50 bg-white dark:bg-gray-800'
                    )}
                  >
                    {getIcon()}
                    <div className={clsx(
                      'text-xs font-semibold mb-0.5',
                      isDisabled && 'text-gray-400 dark:text-gray-600',
                      !isDisabled && isSelected && 'text-orange',
                      !isDisabled && !isSelected && 'text-gray-900 dark:text-gray-100'
                    )}>
                      {option.value}
                    </div>
                    <div className="text-[10px] leading-tight text-gray-500 dark:text-gray-400 line-clamp-2">
                      {info.description}
                    </div>
                  </button>
                );
                
                // Wrap disabled buttons in a div with custom tooltip
                if (isDisabled) {
                  return (
                    <div key={option.value} className="relative group">
                      {button}
                      {/* Custom tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap pointer-events-none z-50">
                        Under Development
                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
                      </div>
                    </div>
                  );
                }
                
                return (
                  <div key={option.value}>
                    {button}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Record Name */}
          <div>
            <Input
              label="Name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              error={errors.name}
              placeholder={getNamePlaceholder()}
              helperText={`FQDN: ${fqdn}`}
            />
          </div>

          {/* TTL */}
          <div>
            {!customTTL ? (
              <div>
                <Dropdown
                  label="TTL (Time to Live)"
                  options={[
                    ...TTL_PRESETS.map(p => ({ value: p.value.toString(), label: `${p.value}s (${p.label})` })),
                    { value: 'custom', label: 'Custom...' },
                  ]}
                  value={formData.ttl.toString()}
                  onChange={handleTTLChange}
                />
                {errors.ttl && (
                  <p className="mt-1.5 text-sm font-regular text-red-500">{errors.ttl}</p>
                )}
              </div>
            ) : (
              <div>
                <Input
                  label="TTL (seconds)"
                  type="number"
                  value={formData.ttl}
                  onChange={(e) => setFormData(prev => ({ ...prev, ttl: parseInt(e.target.value, 10) || 10 }))}
                  error={errors.ttl}
                  min={10}
                  max={604800}
                />
                <p className="mt-1 text-xs text-gray-slate">
                  Min: 10 seconds, Max: 604800 seconds (7 days). Recommended: 15 minutes to 1 day.
                </p>
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

          {/* Value - Dynamic Label Based on Type */}
          <div className="md:col-span-2">
            <Input
              label={
                formData.type === 'A' ? 'IPv4 Address' :
                formData.type === 'AAAA' ? 'IPv6 Address' :
                formData.type === 'CNAME' ? 'Target Domain' :
                formData.type === 'MX' ? 'Mail Server' :
                formData.type === 'NS' ? 'Name Server' :
                formData.type === 'TXT' ? 'Text Value' :
                formData.type === 'SRV' ? 'Target' :
                formData.type === 'CAA' ? 'CAA Value' :
                formData.type === 'PTR' ? 'Target Domain' :
                'Value'
              }
              type="text"
              value={formData.value}
              onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
              error={errors.value}
              placeholder={typeInfo.placeholder}
              helperText={typeInfo.hint}
              suffixHint={
                // Show zone name suffix hint for hostname-based record types
                // Exclude: A, AAAA, TXT, CAA, SOA (these don't use hostnames)
                ['CNAME', 'MX', 'NS', 'SRV', 'PTR'].includes(formData.type) &&
                formData.value &&
                !formData.value.endsWith('.')
                  ? `.${zoneName}.`
                  : undefined
              }
            />
          </div>

          {/* Comment */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Comment
            </label>
            <textarea
              value={formData.comment}
              onChange={(e) => setFormData(prev => ({ ...prev, comment: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 border border-gray-light dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-500"
              placeholder="Optional comment or notes about this record"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 -mx-6 px-6 border-t border-gray-light dark:border-gray-700">
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

