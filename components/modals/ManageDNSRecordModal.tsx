'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { clsx } from 'clsx';
import gsap from 'gsap';
import { Modal } from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Dropdown from '@/components/ui/Dropdown';
import CaaTagDropdown from '@/components/ui/CaaTagDropdown';
import type { DNSRecord, DNSRecordType, DNSRecordFormData } from '@/types/dns';
import { RECORD_TYPE_INFO, TTL_PRESETS } from '@/types/dns';
import { validateDNSRecord, getFQDN, isValidIPv6 } from '@/lib/utils/dns-validation';

interface ManageDNSRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: DNSRecordFormData) => Promise<void>;
  mode: 'add' | 'edit';
  record?: DNSRecord;
  zoneName: string;
  existingRecords: DNSRecord[];
}

type RecordTypeOptionValue = DNSRecordType | 'RFC3597';
type ValueMode = 'structured' | 'raw';
type StructuredRecordType = 'MX' | 'SRV' | 'CAA';

interface RecordTypeOption {
  value: RecordTypeOptionValue;
  label: string;
  disabled: boolean;
}

interface StructuredFields {
  mx: {
    priority: string;
    host: string;
  };
  srv: {
    priority: string;
    weight: string;
    port: string;
    target: string;
  };
  caa: {
    flags: string;
    tag: string;
    value: string;
  };
}

// All possible record types (SOA is intentionally excluded - it should only be edited, not manually created)
const ALL_RECORD_TYPE_OPTIONS: RecordTypeOption[] = [
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

const COMMON_RECORD_TYPES: DNSRecordType[] = ['A', 'AAAA', 'CNAME', 'MX', 'TXT'];
const MOBILE_EXTRA_COMMON_RECORD_TYPE: DNSRecordType = 'NS';
const STRUCTURED_RECORD_TYPES: StructuredRecordType[] = ['MX', 'SRV', 'CAA'];
const CAA_TAG_OPTIONS = [
  { value: 'issue', label: 'issue' },
  { value: 'issuewild', label: 'issuewild' },
  { value: 'iodef', label: 'iodef' },
  { value: 'issuemail', label: 'issuemail' },
  { value: 'contactemail', label: 'contactemail' },
  { value: 'contactphone', label: 'contactphone' },
  { value: 'issuevmc', label: 'issuevmc' },
] as const;

const getDefaultStructuredFields = (): StructuredFields => ({
  mx: { priority: '10', host: '' },
  srv: { priority: '10', weight: '10', port: '5060', target: '' },
  caa: { flags: '0', tag: 'issue', value: '' },
});

const isStructuredRecordType = (value: string): value is StructuredRecordType => {
  return STRUCTURED_RECORD_TYPES.includes(value as StructuredRecordType);
};

const parseMXValue = (value: string): StructuredFields['mx'] | null => {
  const normalized = value.trim().replace(/\s+/g, ' ');
  const match = normalized.match(/^(\d+)\s+(.+)$/);
  if (!match) return null;
  return { priority: match[1], host: match[2] };
};

const parseSRVValue = (value: string): StructuredFields['srv'] | null => {
  const normalized = value.trim().replace(/\s+/g, ' ');
  const match = normalized.match(/^(\d+)\s+(\d+)\s+(\d+)\s+(.+)$/);
  if (!match) return null;
  return {
    priority: match[1],
    weight: match[2],
    port: match[3],
    target: match[4],
  };
};

const parseCAAValue = (value: string): StructuredFields['caa'] | null => {
  const normalized = value.trim();
  const match = normalized.match(/^(\d+)\s+([a-z0-9-]+)\s+"([^"]+)"$/i);
  if (!match) return null;
  return {
    flags: match[1],
    tag: match[2].toLowerCase(),
    value: match[3],
  };
};

const parseStructuredValue = (type: StructuredRecordType, value: string): StructuredFields[Lowercase<StructuredRecordType>] | null => {
  if (type === 'MX') return parseMXValue(value);
  if (type === 'SRV') return parseSRVValue(value);
  return parseCAAValue(value);
};

const composeStructuredValue = (type: StructuredRecordType, fields: StructuredFields): string => {
  if (type === 'MX') {
    const priority = fields.mx.priority.trim() || '10';
    const host = fields.mx.host.trim();
    return host ? `${priority} ${host}` : '';
  }

  if (type === 'SRV') {
    const priority = fields.srv.priority.trim() || '10';
    const weight = fields.srv.weight.trim() || '10';
    const port = fields.srv.port.trim() || '5060';
    const target = fields.srv.target.trim();
    return target ? `${priority} ${weight} ${port} ${target}` : '';
  }

  const flags = fields.caa.flags.trim() || '0';
  const tag = fields.caa.tag.trim() || 'issue';
  const value = fields.caa.value.trim();
  return value ? `${flags} ${tag} "${value}"` : '';
};

const getValueLabel = (type: DNSRecordType): string => {
  if (type === 'A') return 'IPv4 Address';
  if (type === 'AAAA') return 'IPv6 Address';
  if (type === 'CNAME') return 'Target Domain';
  if (type === 'MX') return 'Mail Server';
  if (type === 'NS') return 'Name Server';
  if (type === 'TXT') return 'Text Value';
  if (type === 'SRV') return 'Target';
  if (type === 'CAA') return 'CAA Value';
  if (type === 'PTR') return 'Target Domain';
  return 'Value';
};

const getRecordTypeIcon = (type: RecordTypeOptionValue, isSelected: boolean) => {
  const iconClass = clsx('w-5 h-5 mb-1 transition-all', isSelected ? 'text-accent' : 'text-gray-500 dark:text-gray-400');

  switch (type) {
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

export function ManageDNSRecordModal({
  isOpen,
  onClose,
  onSubmit,
  mode,
  record,
  zoneName,
  existingRecords,
}: ManageDNSRecordModalProps) {
  const recordTypeOptions = ALL_RECORD_TYPE_OPTIONS;
  const [formData, setFormData] = useState<DNSRecordFormData>({
    name: '',
    type: 'A',
    value: '',
    ttl: 3600,
    comment: '',
  });
  const [structuredFields, setStructuredFields] = useState<StructuredFields>(getDefaultStructuredFields());
  const [typeSearchQuery, setTypeSearchQuery] = useState('');
  const [showAllTypes, setShowAllTypes] = useState(false);
  const [renderAllTypesSection, setRenderAllTypesSection] = useState(false);
  const [valueMode, setValueMode] = useState<ValueMode>('raw');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [warnings, setWarnings] = useState<string[]>([]);
  const [customTTL, setCustomTTL] = useState(false);
  const [realtimeErrors, setRealtimeErrors] = useState<Record<string, string>>({});
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const allTypesSectionRef = useRef<HTMLDivElement | null>(null);
  const valueModeToggleTrackRef = useRef<HTMLButtonElement | null>(null);
  const valueModeToggleKnobRef = useRef<HTMLSpanElement | null>(null);
  const previousValueModeRef = useRef<ValueMode | null>(null);
  const rawFallbackValueRef = useRef<string | null>(null);
  const prefersReducedMotionRef = useRef(false);

  // Initialize form data when modal opens or record changes
  useEffect(() => {
    if (!isOpen) return;

    setTypeSearchQuery('');
    setShowAllTypes(false);
    setRenderAllTypesSection(false);
    setStructuredFields(getDefaultStructuredFields());
    rawFallbackValueRef.current = null;
    previousValueModeRef.current = null;

    if (mode === 'edit' && record) {
      setFormData({
        name: record.name,
        type: record.type,
        value: record.value,
        ttl: record.ttl,
        comment: record.comment ?? '',
      });

      if (isStructuredRecordType(record.type)) {
        const parsed = parseStructuredValue(record.type, record.value);
        if (parsed) {
          setStructuredFields((prev) => ({ ...prev, [record.type.toLowerCase()]: parsed }));
          setValueMode('structured');
        } else {
          setValueMode('raw');
        }
      } else {
        setValueMode('raw');
      }

      const isPreset = TTL_PRESETS.some((preset) => preset.value === record.ttl);
      setCustomTTL(!isPreset);
    } else {
      setFormData({
        name: '',
        type: 'A',
        value: '',
        ttl: 3600,
        comment: '',
      });
      setCustomTTL(false);
      setValueMode('raw');
    }

    setErrors({});
    setWarnings([]);
    setRealtimeErrors({});
  }, [isOpen, mode, record]);

  const structuredValue = useMemo(() => {
    if (!isStructuredRecordType(formData.type) || valueMode === 'raw') {
      return formData.value;
    }

    return composeStructuredValue(formData.type, structuredFields);
  }, [formData.type, formData.value, structuredFields, valueMode]);

  const effectiveFormData = useMemo(
    () => ({ ...formData, value: structuredValue }),
    [formData, structuredValue]
  );

  const validation = useMemo(
    () => validateDNSRecord(effectiveFormData, existingRecords, record?.id, zoneName),
    [effectiveFormData, existingRecords, record?.id, zoneName]
  );

  // Real-time validation
  useEffect(() => {
    if (!isOpen) return;
    setErrors(validation.errors);
    setWarnings(validation.warnings);
  }, [validation, isOpen]);

  // Debounced real-time validation for AAAA records
  const debouncedValidateIPv6 = useCallback(
    (value: string) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        if (formData.type === 'AAAA' && value.trim()) {
          if (!isValidIPv6(value)) {
            setRealtimeErrors((prev) => ({ ...prev, value: 'Enter a valid IPv6 address' }));
          } else {
            setRealtimeErrors((prev) => {
              const { value: _value, ...rest } = prev;
              return rest;
            });
          }
        } else {
          setRealtimeErrors((prev) => {
            const { value: _value, ...rest } = prev;
            return rest;
          });
        }
      }, 300);
    },
    [formData.type]
  );

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => {
      prefersReducedMotionRef.current = mediaQuery.matches;
    };

    updatePreference();

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', updatePreference);
      return () => mediaQuery.removeEventListener('change', updatePreference);
    }

    mediaQuery.addListener(updatePreference);
    return () => mediaQuery.removeListener(updatePreference);
  }, []);

  const applyValueModeToggleVisual = useCallback(
    (mode: ValueMode, immediate = false) => {
      const track = valueModeToggleTrackRef.current;
      const knob = valueModeToggleKnobRef.current;

      if (!track || !knob) return;

      const knobTravel = Math.max(0, track.clientWidth - knob.offsetWidth - 8);
      const shouldInstant = immediate || prefersReducedMotionRef.current;

      gsap.killTweensOf([track, knob]);

      const isRawMode = mode === 'raw';
      const knobX = mode === 'raw' ? knobTravel : 0;
      const trackStyles = isRawMode
        ? {
            backgroundColor: 'rgba(249, 115, 22, 0.2)',
            borderColor: 'rgba(249, 115, 22, 0.65)',
          }
        : {
            backgroundColor: 'rgba(14, 165, 233, 0.16)',
            borderColor: 'rgba(14, 165, 233, 0.55)',
          };
      const knobStyles = isRawMode
        ? {
            backgroundColor: 'rgba(249, 115, 22, 0.95)',
            boxShadow: '0 0 18px rgba(249, 115, 22, 0.35)',
          }
        : {
            backgroundColor: 'rgba(14, 165, 233, 0.95)',
            boxShadow: '0 0 18px rgba(14, 165, 233, 0.3)',
          };

      if (shouldInstant) {
        gsap.set(track, trackStyles);
        gsap.set(knob, { x: knobX, ...knobStyles });
        return;
      }

      gsap.to(track, {
        ...trackStyles,
        duration: 0.24,
        ease: 'power2.out',
      });
      gsap.to(knob, {
        x: knobX,
        ...knobStyles,
        duration: 0.24,
        ease: 'power2.out',
      });
    },
    []
  );

  useEffect(() => {
    if (!isOpen || !isStructuredRecordType(formData.type)) {
      previousValueModeRef.current = null;
      return;
    }

    const isFirstRenderForMode = previousValueModeRef.current === null;
    applyValueModeToggleVisual(valueMode, isFirstRenderForMode);
    previousValueModeRef.current = valueMode;
  }, [applyValueModeToggleVisual, formData.type, isOpen, valueMode]);

  // Animate all record types panel open/close
  useEffect(() => {
    if (showAllTypes && !renderAllTypesSection) {
      setRenderAllTypesSection(true);
      return;
    }

    const panel = allTypesSectionRef.current;
    if (!panel) return;

    gsap.killTweensOf(panel);

    if (showAllTypes) {
      setRenderAllTypesSection(true);
      gsap.set(panel, { height: 'auto', overflow: 'hidden' });
      const targetHeight = panel.scrollHeight;
      gsap.fromTo(
        panel,
        { height: 0, opacity: 0 },
        {
          height: targetHeight,
          opacity: 1,
          duration: 0.26,
          ease: 'power2.out',
          onComplete: () => {
            gsap.set(panel, { height: 'auto', overflow: 'visible' });
          },
        }
      );
      return;
    }

    if (renderAllTypesSection) {
      const currentHeight = panel.offsetHeight;
      gsap.set(panel, { height: currentHeight, overflow: 'hidden' });
      gsap.to(panel, {
        height: 0,
        opacity: 0,
        duration: 0.2,
        ease: 'power2.in',
        onComplete: () => {
          setRenderAllTypesSection(false);
        },
      });
    }
  }, [showAllTypes, renderAllTypesSection]);

  const parsedRawStructured = useMemo(() => {
    if (!isStructuredRecordType(formData.type) || valueMode !== 'raw') {
      return null;
    }
    return parseStructuredValue(formData.type, formData.value);
  }, [formData.type, formData.value, valueMode]);

  const searchedRecordTypes = useMemo(() => {
    const query = typeSearchQuery.trim().toLowerCase();
    if (!query) return recordTypeOptions;

    const matches = recordTypeOptions.filter((option) => {
      const info =
        option.value in RECORD_TYPE_INFO
          ? RECORD_TYPE_INFO[option.value as DNSRecordType]
          : { description: 'Generic/Unknown record type' };

      const searchable = `${option.value} ${option.label} ${info.description}`.toLowerCase();
      return searchable.includes(query);
    });
    return matches;
  }, [recordTypeOptions, typeSearchQuery]);

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setFormData((prev) => ({ ...prev, value: newValue }));
    debouncedValidateIPv6(newValue);
  };

  const handleValueBlur = () => {
    if (formData.type === 'AAAA' && formData.value.trim()) {
      if (!isValidIPv6(formData.value)) {
        setRealtimeErrors((prev) => ({ ...prev, value: 'Enter a valid IPv6 address' }));
      } else {
        setRealtimeErrors((prev) => {
          const { value: _value, ...rest } = prev;
          return rest;
        });
      }
    }
  };

  const handleTypeChange = (type: DNSRecordType) => {
    const typeInfo = RECORD_TYPE_INFO[type];
    setFormData((prev) => ({
      ...prev,
      type,
      ttl: typeInfo.defaultTTL,
    }));
    setValueMode(isStructuredRecordType(type) ? 'structured' : 'raw');
    setTypeSearchQuery('');
    rawFallbackValueRef.current = null;

    if (type !== 'AAAA') {
      setRealtimeErrors((prev) => {
        const { value: _value, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleTTLChange = (value: string) => {
    if (value === 'custom') {
      setCustomTTL(true);
      return;
    }

    setCustomTTL(false);
    setFormData((prev) => ({ ...prev, ttl: parseInt(value, 10) }));
  };

  const switchToRawMode = () => {
    if (!isStructuredRecordType(formData.type)) return;

    const fallbackRawValue = rawFallbackValueRef.current;
    const nextRawValue = fallbackRawValue ?? composeStructuredValue(formData.type, structuredFields);
    setFormData((prev) => ({ ...prev, value: nextRawValue }));
    rawFallbackValueRef.current = null;
    setValueMode('raw');
  };

  const switchToStructuredMode = () => {
    if (!isStructuredRecordType(formData.type)) return;

    if (parsedRawStructured) {
      setStructuredFields((prev) => ({ ...prev, [formData.type.toLowerCase()]: parsedRawStructured }));
      rawFallbackValueRef.current = null;
    } else {
      const defaults = getDefaultStructuredFields();
      if (formData.type === 'MX') {
        setStructuredFields((prev) => ({ ...prev, mx: defaults.mx }));
      } else if (formData.type === 'SRV') {
        setStructuredFields((prev) => ({ ...prev, srv: defaults.srv }));
      } else {
        setStructuredFields((prev) => ({ ...prev, caa: defaults.caa }));
      }
      rawFallbackValueRef.current = formData.value;
    }
    setValueMode('structured');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalValidation = validateDNSRecord(effectiveFormData, existingRecords, record?.id, zoneName);
    if (!finalValidation.valid) {
      setErrors(finalValidation.errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const recordToSave = {
        ...effectiveFormData,
        name: finalValidation.normalizedName || effectiveFormData.name,
        value: finalValidation.normalizedValue || effectiveFormData.value,
      };
      await onSubmit(recordToSave);
      onClose();
    } catch (error: any) {
      setErrors({ general: error.message || 'Failed to save record' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getNamePlaceholder = () => {
    if (formData.type === 'PTR') return 'PTR record name (e.g. 1 or 10.0)';
    if (formData.type === 'CNAME') return 'Subdomain (e.g., www, blog, api)';
    if (formData.type === 'NS') return 'Subdomain (e.g., dev, staging, prod)';
    return '@ (root) or subdomain (e.g., www, blog, mail)';
  };

  const renderRecordTypeButton = (option: RecordTypeOption, wrapperClassName?: string, keySuffix = '') => {
    const isSelected = formData.type === option.value;
    const info =
      option.value in RECORD_TYPE_INFO
        ? RECORD_TYPE_INFO[option.value as DNSRecordType]
        : {
            description: 'Generic/Unknown record type',
          };
    const isDisabled = option.disabled;

    const button = (
      <button
        type="button"
        onClick={() => !isDisabled && handleTypeChange(option.value as DNSRecordType)}
        disabled={isDisabled}
        aria-pressed={isSelected}
        aria-disabled={isDisabled}
        data-testid={`record-type-${option.value}`}
        className={clsx(
          'w-full rounded-lg border-2 p-2 text-center transition-all',
          isDisabled && 'cursor-not-allowed opacity-50 bg-gray-50 dark:bg-gray-800/50',
          !isDisabled && isSelected && 'border-accent bg-accent-soft dark:bg-accent/20',
          !isDisabled && !isSelected && 'border-gray-200 bg-surface hover:border-accent/50 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-accent/50'
        )}
      >
        <div className="flex flex-col items-center justify-center">
          {getRecordTypeIcon(option.value, isSelected)}
          <div
            className={clsx(
              'mb-0.5 text-xs font-semibold',
              isDisabled && 'text-gray-400 dark:text-gray-600',
              !isDisabled && isSelected && 'text-accent',
              !isDisabled && !isSelected && 'text-gray-900 dark:text-gray-100'
            )}
          >
            {option.value}
          </div>
          <div className="line-clamp-2 text-[10px] leading-tight text-gray-500 dark:text-gray-400">
            {info.description}
          </div>
        </div>
      </button>
    );

    if (!isDisabled) {
      return (
        <div key={`${option.value}${keySuffix}`} className={wrapperClassName}>
          {button}
        </div>
      );
    }

    return (
      <div key={`${option.value}${keySuffix}`} className={clsx('relative group', wrapperClassName)}>
        {button}
        <div className="pointer-events-none absolute bottom-full left-1/2 invisible mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-3 py-1.5 text-xs text-white opacity-0 transition-all duration-200 group-hover:visible group-hover:opacity-100 dark:bg-gray-700 z-50">
          Under Development
          <div className="absolute left-1/2 top-full -mt-1 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700" />
        </div>
      </div>
    );
  };

  const renderValueModeToggle = () => {
    if (!isStructuredRecordType(formData.type)) return null;

    const toggleToMode = (targetMode: ValueMode) => {
      if (targetMode === valueMode) return;
      if (targetMode === 'raw') {
        switchToRawMode();
        return;
      }
      switchToStructuredMode();
    };

    return (
      <button
        ref={valueModeToggleTrackRef}
        type="button"
        aria-label={`Value mode: ${valueMode === 'structured' ? 'Guided' : 'Raw'}`}
        aria-pressed={valueMode === 'raw'}
        className="relative inline-flex h-9 w-[4.25rem] items-center rounded-full border border-blue-electric/50 bg-blue-electric/10 p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-electric"
        onClick={() => toggleToMode(valueMode === 'structured' ? 'raw' : 'structured')}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') {
            event.preventDefault();
            toggleToMode('structured');
          }
          if (event.key === 'ArrowRight') {
            event.preventDefault();
            toggleToMode('raw');
          }
        }}
      >
        <span
          ref={valueModeToggleKnobRef}
          className="pointer-events-none absolute left-1 top-1/2 h-7 w-7 -translate-y-1/2 rounded-full bg-blue-electric"
        />
      </button>
    );
  };

  const renderStructuredValueHeader = () => {
    if (!isStructuredRecordType(formData.type)) return null;

    const modeLabel = valueMode === 'structured' ? 'Guided' : 'Raw';

    return (
      <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-text">{`${modeLabel} ${formData.type} Value`}</p>
        {renderValueModeToggle()}
      </div>
    );
  };

  const renderStructuredValueEditor = () => {
    if (!isStructuredRecordType(formData.type) || valueMode === 'raw') return null;

    if (formData.type === 'MX') {
      return (
        <div className="md:col-span-2 rounded-lg border border-border/70 bg-transparent p-4 dark:border-gray-700/70">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input
              id="mx-priority"
              label="Priority"
              type="number"
              value={structuredFields.mx.priority}
              onChange={(e) =>
                setStructuredFields((prev) => ({
                  ...prev,
                  mx: { ...prev.mx, priority: e.target.value },
                }))
              }
              min={0}
              max={65535}
              placeholder="10"
            />
            <Input
              id="mx-host"
              label="Mail Server Hostname"
              type="text"
              value={structuredFields.mx.host}
              onChange={(e) =>
                setStructuredFields((prev) => ({
                  ...prev,
                  mx: { ...prev.mx, host: e.target.value },
                }))
              }
              placeholder="mail.example.com"
            />
          </div>
          <p className="mt-1 text-xs text-text-muted">Composed value: `{effectiveFormData.value || '...'}`</p>
          {(realtimeErrors.value || errors.value) && (
            <p className="mt-1 text-sm font-regular text-red-500">{realtimeErrors.value || errors.value}</p>
          )}
        </div>
      );
    }

    if (formData.type === 'SRV') {
      return (
        <div className="md:col-span-2 rounded-lg border border-border/70 bg-transparent p-4 dark:border-gray-700/70">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <Input
              id="srv-priority"
              label="Priority"
              type="number"
              value={structuredFields.srv.priority}
              onChange={(e) =>
                setStructuredFields((prev) => ({
                  ...prev,
                  srv: { ...prev.srv, priority: e.target.value },
                }))
              }
              min={0}
              max={65535}
              placeholder="10"
            />
            <Input
              id="srv-weight"
              label="Weight"
              type="number"
              value={structuredFields.srv.weight}
              onChange={(e) =>
                setStructuredFields((prev) => ({
                  ...prev,
                  srv: { ...prev.srv, weight: e.target.value },
                }))
              }
              min={0}
              max={65535}
              placeholder="10"
            />
            <Input
              id="srv-port"
              label="Port"
              type="number"
              value={structuredFields.srv.port}
              onChange={(e) =>
                setStructuredFields((prev) => ({
                  ...prev,
                  srv: { ...prev.srv, port: e.target.value },
                }))
              }
              min={0}
              max={65535}
              placeholder="5060"
            />
            <Input
              id="srv-target"
              label="Target"
              type="text"
              value={structuredFields.srv.target}
              onChange={(e) =>
                setStructuredFields((prev) => ({
                  ...prev,
                  srv: { ...prev.srv, target: e.target.value },
                }))
              }
              placeholder="sip.example.com"
            />
          </div>
          <p className="mt-1 text-xs text-text-muted">Composed value: `{effectiveFormData.value || '...'}`</p>
          {(realtimeErrors.value || errors.value) && (
            <p className="mt-1 text-sm font-regular text-red-500">{realtimeErrors.value || errors.value}</p>
          )}
        </div>
      );
    }

    return (
      <div className="md:col-span-2 rounded-lg border border-border/70 bg-transparent p-4 dark:border-gray-700/70">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Input
            id="caa-flags"
            label="Flags"
            type="number"
            value={structuredFields.caa.flags}
            onChange={(e) =>
              setStructuredFields((prev) => ({
                ...prev,
                caa: { ...prev.caa, flags: e.target.value },
              }))
            }
            min={0}
            max={255}
            placeholder="0"
          />
          <CaaTagDropdown
            id="caa-tag"
            label="Tag"
            value={structuredFields.caa.tag}
            onChange={(value) =>
              setStructuredFields((prev) => ({
                ...prev,
                caa: { ...prev.caa, tag: value.toLowerCase() },
              }))
            }
            options={[...CAA_TAG_OPTIONS]}
          />
          <Input
            id="caa-value"
            label="Value"
            type="text"
            value={structuredFields.caa.value}
            onChange={(e) =>
              setStructuredFields((prev) => ({
                ...prev,
                caa: { ...prev.caa, value: e.target.value },
              }))
            }
            placeholder="letsencrypt.org"
          />
        </div>
        <p className="mt-1 text-xs text-text-muted">Composed value: `{effectiveFormData.value || '...'}`</p>
        {(realtimeErrors.value || errors.value) && (
          <p className="mt-1 text-sm font-regular text-red-500">{realtimeErrors.value || errors.value}</p>
        )}
      </div>
    );
  };

  const typeInfo = RECORD_TYPE_INFO[formData.type];
  const fqdn = getFQDN(formData.name, zoneName);
  const shouldUseRawValueInput = !isStructuredRecordType(formData.type) || valueMode === 'raw';
  const mobileExtraCommonOption = recordTypeOptions.find((option) => option.value === MOBILE_EXTRA_COMMON_RECORD_TYPE);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={mode === 'add' ? 'Add DNS Record' : 'Edit DNS Record'} size="xlarge">
      <form onSubmit={handleSubmit} className="space-y-5">
        {errors.general && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
            <p className="text-sm text-red-800 dark:text-red-400">{errors.general}</p>
          </div>
        )}

        {warnings.length > 0 && (
          <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-900/20">
            <ul className="space-y-1 text-sm text-yellow-800 dark:text-yellow-400">
              {warnings.map((warning, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <svg className="mt-0.5 h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {warning}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Record Type</label>

            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Common Types</p>
            <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {recordTypeOptions
                .filter((option) => COMMON_RECORD_TYPES.includes(option.value as DNSRecordType))
                .map((option) => renderRecordTypeButton(option))}
              {mobileExtraCommonOption ? renderRecordTypeButton(mobileExtraCommonOption, 'sm:hidden', '-mobile-extra') : null}
            </div>

            <button
              type="button"
              className="mb-2 inline-flex items-center gap-2 text-xs font-medium text-blue-electric hover:underline"
              onClick={() => setShowAllTypes((prev) => !prev)}
            >
              {showAllTypes ? 'Hide all record types' : 'Show all record types'}
            </button>

            {renderAllTypesSection && (
              <div
                ref={allTypesSectionRef}
                className="overflow-hidden will-change-[height,opacity]"
              >
                <div className="rounded-lg border border-border/60 p-3 dark:border-gray-700/60">
                  <Input
                    id="record-type-search"
                    label="Search Types"
                    type="text"
                    value={typeSearchQuery}
                    onChange={(e) => setTypeSearchQuery(e.target.value)}
                    placeholder="Search record types..."
                  />
                  <div data-testid="all-record-types-grid" className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
                    {searchedRecordTypes.map((option) => renderRecordTypeButton(option))}
                  </div>
                  {searchedRecordTypes.length === 0 && (
                    <p className="mt-3 text-xs text-text-muted">No record types match your search.</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div>
            <Input
              id="record-name"
              label="Name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              error={errors.name}
              placeholder={getNamePlaceholder()}
              helperText={`FQDN: ${fqdn}`}
            />
          </div>

          <div>
            {!customTTL ? (
              <div>
                <Dropdown
                  label="TTL (Time to Live)"
                  options={[
                    ...TTL_PRESETS.map((preset) => ({ value: preset.value.toString(), label: `${preset.value}s (${preset.label})` })),
                    { value: 'custom', label: 'Custom...' },
                  ]}
                  value={formData.ttl.toString()}
                  onChange={handleTTLChange}
                />
                {errors.ttl && <p className="mt-1.5 text-sm font-regular text-red-500">{errors.ttl}</p>}
              </div>
            ) : (
              <div>
                <Input
                  id="custom-ttl"
                  label="TTL (seconds)"
                  type="number"
                  value={formData.ttl}
                  onChange={(e) => setFormData((prev) => ({ ...prev, ttl: parseInt(e.target.value, 10) || 10 }))}
                  error={errors.ttl}
                  min={10}
                  max={604800}
                />
                <p className="mt-1 text-xs text-text-muted">
                  Min: 10 seconds, Max: 604800 seconds (7 days). Recommended: 15 minutes to 1 day.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setCustomTTL(false);
                    setFormData((prev) => ({ ...prev, ttl: 3600 }));
                  }}
                  className="mt-1 text-xs text-accent transition-colors hover:text-text"
                >
                  Use preset values
                </button>
              </div>
            )}
          </div>

          {isStructuredRecordType(formData.type) && renderStructuredValueHeader()}

          {renderStructuredValueEditor()}

          {shouldUseRawValueInput && (
            <div className="md:col-span-2">
              <Input
                id="record-value"
                label={getValueLabel(formData.type)}
                type="text"
                value={formData.value}
                onChange={handleValueChange}
                onBlur={handleValueBlur}
                error={realtimeErrors.value || errors.value}
                placeholder={typeInfo.placeholder}
                helperText={typeInfo.hint}
                suffixHint={
                  ['CNAME', 'MX', 'NS', 'SRV', 'PTR'].includes(formData.type) &&
                  formData.value &&
                  !formData.value.endsWith('.')
                    ? `.${zoneName}.`
                    : undefined
                }
              />
            </div>
          )}

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Comment</label>
            <textarea
              value={formData.comment}
              onChange={(e) => setFormData((prev) => ({ ...prev, comment: e.target.value }))}
              rows={2}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-accent dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
              placeholder="Optional comment or notes about this record"
            />
          </div>
        </div>

        <div className="-mx-6 flex items-center justify-end gap-3 border-t border-border px-6 pt-4 dark:border-gray-700">
          <Button type="button" variant="outline" className="h-10" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" className="h-10" disabled={isSubmitting || !validation.valid} loading={isSubmitting}>
            {mode === 'add' ? 'Create Record' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
