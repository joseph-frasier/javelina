'use client';

import { useState, useMemo, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { clsx } from 'clsx';
import gsap from 'gsap';
import type { DNSRecord, DNSRecordType } from '@/types/dns';
import { RECORD_TYPE_INFO } from '@/types/dns';
import { Tooltip } from '@/components/ui/Tooltip';
import { ExportButton } from '@/components/admin/ExportButton';
import { getFQDN } from '@/lib/utils/dns-validation';

interface DNSRecordsTableProps {
  records: DNSRecord[];
  selectedRecords: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  onRecordClick: (record: DNSRecord) => void;
  loading?: boolean;
  zoneName: string;
  nameservers?: string[];
  soaSerial?: number;
  defaultTTL?: number;
}

// Canonical display order for record types
const TYPE_ORDER: DNSRecordType[] = ['A', 'AAAA', 'CNAME', 'MX', 'NS', 'TXT', 'SRV', 'CAA', 'PTR', 'SOA'];

// Record types where the value is a hostname that gets the zone suffix appended in display
const ZONE_SUFFIX_TYPES = new Set<DNSRecordType>(['CNAME', 'MX', 'NS', 'SRV', 'PTR']);

export function DNSRecordsTable({
  records,
  selectedRecords,
  onSelectionChange,
  onRecordClick,
  loading = false,
  zoneName,
  nameservers,
  soaSerial,
  defaultTTL,
}: DNSRecordsTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<keyof DNSRecord | null>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [activeTypeFilter, setActiveTypeFilter] = useState<DNSRecordType | 'all'>('all');

  // expandedSections is the exception list — default is collapsed.
  // Stored in localStorage so the user's open/close choices persist across page visits.
  const storageKey = useMemo(() => `dns-expanded-sections-${zoneName}`, [zoneName]);
  const [expandedSections, setExpandedSections] = useState<Set<DNSRecordType>>(() => {
    try {
      const raw = localStorage.getItem(`dns-expanded-sections-${zoneName}`);
      if (raw) return new Set(JSON.parse(raw) as DNSRecordType[]);
    } catch {}
    return new Set();
  });

  const sectionContentRefs = useRef<Map<DNSRecordType, HTMLDivElement | null>>(new Map());
  const chevronRefs = useRef<Map<DNSRecordType, SVGSVGElement | null>>(new Map());
  const activeTweens = useRef<gsap.core.Tween[]>([]);

  const filteredRecords = useMemo(() => {
    let filtered = records.filter(record => {
      if (record.type === 'NS') {
        const n = record.name.trim();
        return !(n === '@' || n === '' || n === zoneName);
      }
      return true;
    });

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q) ||
        r.value.toLowerCase().includes(q) ||
        (r.comment && r.comment.toLowerCase().includes(q))
      );
    }

    return filtered;
  }, [records, searchQuery, zoneName]);

  const filteredAndSortedRecords = useMemo(() => {
    if (!sortKey) return filteredRecords;
    return [...filteredRecords].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      return sortDirection === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
  }, [filteredRecords, sortKey, sortDirection]);

  // Single pass: build both presentTypes and groupedRecords
  const { presentTypes, groupedRecords } = useMemo(() => {
    const typeSet = new Set<DNSRecordType>();
    const groups = new Map<DNSRecordType, DNSRecord[]>();
    for (const record of filteredAndSortedRecords) {
      typeSet.add(record.type);
      if (!groups.has(record.type)) groups.set(record.type, []);
      groups.get(record.type)!.push(record);
    }
    return { presentTypes: TYPE_ORDER.filter(t => typeSet.has(t)), groupedRecords: groups };
  }, [filteredAndSortedRecords]);

  const visibleTypes = activeTypeFilter === 'all' ? presentTypes : [activeTypeFilter];
  const isSingleTypeView = activeTypeFilter !== 'all';

  // Reset active filter if search removes all records of the filtered type
  useEffect(() => {
    if (activeTypeFilter !== 'all' && !presentTypes.includes(activeTypeFilter)) {
      setActiveTypeFilter('all');
    }
  }, [presentTypes, activeTypeFilter]);

  // Persist expanded sections to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(Array.from(expandedSections)));
    } catch {}
  }, [expandedSections, storageKey]);

  // Set initial GSAP height/rotation for all sections whenever visible sections change.
  // Runs after DOM update so refs are populated. GSAP owns these inline styles from here on.
  useLayoutEffect(() => {
    visibleTypes.forEach(type => {
      const contentEl = sectionContentRefs.current.get(type);
      const chevronEl = chevronRefs.current.get(type);
      const isExpanded = expandedSections.has(type);

      if (contentEl) {
        if (!isSingleTypeView && !isExpanded) {
          gsap.set(contentEl, { height: 0, overflow: 'hidden' });
        } else {
          gsap.set(contentEl, { clearProps: 'all' });
        }
      }
      if (chevronEl) {
        gsap.set(chevronEl, { rotate: isSingleTypeView || isExpanded ? 180 : 0 });
      }
    });
  }, [visibleTypes]); // eslint-disable-line react-hooks/exhaustive-deps
  // Intentionally only re-runs when sections change, not on every toggle —
  // toggleSection handles GSAP for individual open/close after initial setup.

  // Kill tweens on unmount
  useEffect(() => () => { activeTweens.current.forEach(t => t.kill()); }, []);

  const handleSort = useCallback((key: keyof DNSRecord) => {
    if (sortKey === key) {
      if (sortDirection === 'asc') setSortDirection('desc');
      else { setSortKey(null); setSortDirection('asc'); }
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  }, [sortKey, sortDirection]);

  const toggleSection = useCallback((type: DNSRecordType) => {
    const contentEl = sectionContentRefs.current.get(type);
    const chevronEl = chevronRefs.current.get(type);
    if (!contentEl) return;

    // Kill any in-flight tweens before starting new ones
    activeTweens.current.forEach(t => t.kill());
    activeTweens.current = [];

    if (expandedSections.has(type)) {
      activeTweens.current.push(
        gsap.fromTo(contentEl,
          { height: contentEl.offsetHeight, overflow: 'hidden' },
          { height: 0, duration: 0.35, ease: 'power3.inOut' }
        )
      );
      if (chevronEl) activeTweens.current.push(
        gsap.to(chevronEl, { rotate: 0, duration: 0.3, ease: 'power2.out' })
      );
    } else {
      activeTweens.current.push(
        gsap.fromTo(contentEl,
          { height: 0, overflow: 'hidden' },
          { height: 'auto', duration: 0.4, ease: 'power3.out', clearProps: 'overflow,height' }
        )
      );
      if (chevronEl) activeTweens.current.push(
        gsap.to(chevronEl, { rotate: 180, duration: 0.3, ease: 'power2.out' })
      );
    }

    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, [expandedSections]);

  const handleSectionSelectAll = useCallback((sectionRecords: DNSRecord[], checked: boolean) => {
    const ids = sectionRecords.map(r => r.id);
    if (checked) {
      const combined = new Set(selectedRecords);
      ids.forEach(id => combined.add(id));
      onSelectionChange(Array.from(combined));
    } else {
      const idSet = new Set(ids);
      onSelectionChange(selectedRecords.filter(id => !idSet.has(id)));
    }
  }, [selectedRecords, onSelectionChange]);

  const handleSelectRecord = useCallback((recordId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedRecords, recordId]);
    } else {
      onSelectionChange(selectedRecords.filter(id => id !== recordId));
    }
  }, [selectedRecords, onSelectionChange]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="flex gap-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
          ))}
        </div>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No DNS records</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Get started by creating your first DNS record.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      <div className="relative">
        <input
          type="search"
          placeholder="Search records by name, type, or value..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 pl-10 rounded-md border border-border bg-surface text-gray-900 dark:text-gray-100 placeholder:text-text-faint focus:outline-none focus:ring-2 focus:ring-accent transition-colors"
        />
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setActiveTypeFilter('all')}
            className={clsx(
              'px-3 py-1 rounded-full text-xs font-semibold transition-all border',
              activeTypeFilter === 'all'
                ? 'bg-accent text-white border-accent shadow-sm'
                : 'bg-surface text-gray-600 dark:text-gray-300 border-border hover:border-accent dark:hover:border-accent hover:text-accent dark:hover:text-accent'
            )}
          >
            All
            <span className={clsx(
              'ml-1.5 px-1.5 py-0.5 rounded-full text-xs',
              activeTypeFilter === 'all'
                ? 'bg-surface/20 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            )}>
              {filteredRecords.length}
            </span>
          </button>

          {presentTypes.map(type => {
            const isActive = activeTypeFilter === type;
            return (
              <button
                key={type}
                onClick={() => setActiveTypeFilter(isActive ? 'all' : type)}
                className={clsx(
                  'px-3 py-1 rounded-full text-xs font-semibold transition-all border',
                  isActive
                    ? 'bg-accent text-white border-accent shadow-sm'
                    : 'bg-surface text-gray-600 dark:text-gray-300 border-border hover:border-accent dark:hover:border-accent hover:text-accent dark:hover:text-accent'
                )}
              >
                {type}
                <span className={clsx(
                  'ml-1.5 px-1.5 py-0.5 rounded-full text-xs',
                  isActive
                    ? 'bg-surface/20 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                )}>
                  {groupedRecords.get(type)?.length ?? 0}
                </span>
              </button>
            );
          })}
        </div>

        <ExportButton
          data={selectedRecords.length > 0
            ? filteredAndSortedRecords.filter(r => selectedRecords.includes(r.id))
            : filteredAndSortedRecords
          }
          filename={`${zoneName}-dns-records`}
          label="Export Records"
          zoneName={zoneName}
          nameservers={nameservers}
          soaSerial={soaSerial}
          defaultTTL={defaultTTL}
        />
      </div>

      {filteredAndSortedRecords.length === 0 && (
        <div className="text-center py-12 border border-dashed border-border rounded-lg">
          <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No matching DNS records</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Try a different search term.</p>
          {searchQuery.trim() && (
            <button
              onClick={() => setSearchQuery('')}
              className="mt-4 inline-flex items-center rounded-md border border-border px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-surface-hover transition-colors"
            >
              Clear search
            </button>
          )}
        </div>
      )}

      {visibleTypes.map(type => {
        const sectionRecords = groupedRecords.get(type) ?? [];
        if (sectionRecords.length === 0) return null;

        const info = RECORD_TYPE_INFO[type];
        const isExpanded = expandedSections.has(type);
        const allSectionSelected = sectionRecords.every(r => selectedRecords.includes(r.id));
        const someSectionSelected = sectionRecords.some(r => selectedRecords.includes(r.id)) && !allSectionSelected;

        return (
          <div key={type} className="border border-border rounded-lg overflow-hidden">

            <div
              className={clsx(
                'flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/60',
                !isSingleTypeView && 'cursor-pointer hover:bg-surface-hover/60 transition-colors'
              )}
              onClick={() => !isSingleTypeView && toggleSection(type)}
            >
              <div className="flex items-center gap-3">
                <div onClick={e => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={allSectionSelected}
                    ref={el => { if (el) el.indeterminate = someSectionSelected; }}
                    onChange={e => handleSectionSelectAll(sectionRecords, e.target.checked)}
                    className="w-4 h-4 text-accent bg-surface border-gray-300 dark:border-gray-600 rounded focus:ring-accent focus:ring-2 cursor-pointer"
                  />
                </div>
                <span className="px-2 py-1 bg-blue-electric/10 dark:bg-blue-electric/20 text-blue-electric rounded text-xs font-semibold">
                  {type}
                </span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {info.description}
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-accent/10 text-text">
                  {sectionRecords.length} {sectionRecords.length === 1 ? 'record' : 'records'}
                </span>
              </div>

              {!isSingleTypeView && (
                <svg
                  ref={el => { chevronRefs.current.set(type, el); }}
                  className="w-4 h-4 text-gray-400 dark:text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </div>

            {/* Always rendered — GSAP controls height so animations stay smooth */}
            <div ref={el => { sectionContentRefs.current.set(type, el); }}>

              <div className="hidden md:block overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-surface/30">
                      <th className="py-2 px-4 w-12" />
                      {([
                        { key: 'name' as keyof DNSRecord, label: 'Name' },
                        { key: 'type' as keyof DNSRecord, label: 'Type' },
                        { key: 'value' as keyof DNSRecord, label: 'Value' },
                        { key: 'ttl' as keyof DNSRecord, label: 'TTL' },
                      ]).map(col => (
                        <th
                          key={col.key}
                          className={clsx(
                            'text-left py-2 px-4 text-xs font-semibold uppercase tracking-wider transition-colors select-none cursor-pointer hover:text-accent dark:hover:text-accent',
                            sortKey === col.key
                              ? 'text-text'
                              : 'text-gray-500 dark:text-gray-400'
                          )}
                          onClick={() => handleSort(col.key)}
                        >
                          <div className="flex items-center gap-1.5">
                            {col.label}
                            {sortKey === col.key && (
                              <span className="text-accent">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-light dark:divide-gray-700/60">
                    {sectionRecords.map(record => {
                      const isSelected = selectedRecords.includes(record.id);
                      const fqdn = getFQDN(record.name, zoneName);
                      const showZoneSuffix = ZONE_SUFFIX_TYPES.has(record.type) && !record.value.endsWith('.');

                      return (
                        <tr
                          key={record.id}
                          className={clsx(
                            'transition-colors cursor-pointer',
                            isSelected
                              ? 'bg-accent/10 dark:bg-accent/20'
                              : 'bg-surface/20 hover:bg-surface-hover dark:hover:bg-gray-700/30'
                          )}
                          onClick={() => onRecordClick(record)}
                        >
                          <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={e => handleSelectRecord(record.id, e.target.checked)}
                              className="w-4 h-4 text-accent bg-surface border-gray-300 dark:border-gray-600 rounded focus:ring-accent focus:ring-2 cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <Tooltip content={fqdn}>
                              <span className="text-sm font-medium text-text">
                                {record.name || '@'}
                              </span>
                            </Tooltip>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 bg-blue-electric/10 dark:bg-blue-electric/20 text-blue-electric rounded text-xs font-medium">
                              {record.type}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <Tooltip content={showZoneSuffix ? `${record.value}.${zoneName}.` : record.value}>
                              <span className="text-sm text-text-muted font-mono truncate block max-w-md">
                                {record.value}
                                {showZoneSuffix && (
                                  <span className="text-gray-400 dark:text-gray-600">.{zoneName}.</span>
                                )}
                              </span>
                            </Tooltip>
                          </td>
                          <td className="py-3 px-4 text-sm text-text-muted">
                            {record.ttl}s
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden divide-y divide-gray-light dark:divide-gray-700/60">
                {sectionRecords.map(record => {
                  const isSelected = selectedRecords.includes(record.id);
                  const fqdn = getFQDN(record.name, zoneName);
                  const showZoneSuffix = ZONE_SUFFIX_TYPES.has(record.type) && !record.value.endsWith('.');

                  return (
                    <div
                      key={record.id}
                      className={clsx(
                        'p-4 transition-colors cursor-pointer',
                        isSelected
                          ? 'bg-accent/10 dark:bg-accent/20'
                          : 'bg-surface/20 hover:bg-surface-hover dark:hover:bg-gray-700/30'
                      )}
                      onClick={() => onRecordClick(record)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={e => handleSelectRecord(record.id, e.target.checked)}
                            className="w-4 h-4 text-accent bg-surface border-gray-300 dark:border-gray-600 rounded focus:ring-accent focus:ring-2 cursor-pointer"
                          />
                          <div>
                            <div className="text-sm font-medium text-text">{record.name || '@'}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{fqdn}</div>
                          </div>
                        </div>
                        <span className="px-2 py-1 bg-blue-electric/10 dark:bg-blue-electric/20 text-blue-electric rounded text-xs font-medium">
                          {record.type}
                        </span>
                      </div>
                      <div className="space-y-1 text-sm pl-7">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Value: </span>
                          <span className="text-gray-900 dark:text-gray-100 font-mono break-all">
                            {record.value}
                            {showZoneSuffix && <span className="text-gray-400 dark:text-gray-600">.{zoneName}.</span>}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">TTL: {record.ttl}s</div>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          </div>
        );
      })}

      {filteredAndSortedRecords.length > 0 && (
        <p className="text-xs text-gray-400 dark:text-gray-500 text-right">
          {isSingleTypeView
            ? `${groupedRecords.get(activeTypeFilter as DNSRecordType)?.length ?? 0} ${activeTypeFilter} record${(groupedRecords.get(activeTypeFilter as DNSRecordType)?.length ?? 0) !== 1 ? 's' : ''}`
            : `${filteredAndSortedRecords.length} record${filteredAndSortedRecords.length !== 1 ? 's' : ''} across ${visibleTypes.length} type${visibleTypes.length !== 1 ? 's' : ''}`
          }
        </p>
      )}

    </div>
  );
}
