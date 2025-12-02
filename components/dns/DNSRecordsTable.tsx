'use client';

import { useState, useMemo, useCallback } from 'react';
import { clsx } from 'clsx';
import type { DNSRecord } from '@/types/dns';
import { RECORD_TYPE_INFO } from '@/types/dns';
import { Tooltip } from '@/components/ui/Tooltip';
import { ExportButton } from '@/components/admin/ExportButton';
import { TagBadge } from '@/components/ui/TagBadge';
import type { Tag, RecordTagAssignment } from '@/lib/mock-tags-data';
import { getTagsForRecord } from '@/lib/mock-tags-data';

interface DNSRecordsTableProps {
  records: DNSRecord[];
  selectedRecords: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  onRecordClick: (record: DNSRecord) => void;
  onStatusToggle?: (record: DNSRecord) => void;
  loading?: boolean;
  zoneName: string;
  // Zone metadata for BIND export
  nameservers?: string[];
  soaSerial?: number;
  defaultTTL?: number;
  // Tag-related props (mockup)
  tags?: Tag[];
  recordTagAssignments?: RecordTagAssignment[];
  activeTagIds?: string[];
  onTagClick?: (tagId: string) => void;
  onAssignTags?: (recordId: string, recordName: string) => void;
  onClearTagFilters?: () => void;
}

export function DNSRecordsTable({
  records,
  selectedRecords,
  onSelectionChange,
  onRecordClick,
  onStatusToggle,
  loading = false,
  zoneName,
  nameservers,
  soaSerial,
  defaultTTL,
  // Tag props
  tags = [],
  recordTagAssignments = [],
  activeTagIds = [],
  onTagClick,
  onAssignTags,
  onClearTagFilters,
}: DNSRecordsTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<keyof DNSRecord | null>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilters, setStatusFilters] = useState<Set<string>>(new Set());
  const [priorityFilters, setPriorityFilters] = useState<Set<string>>(new Set());

  // Define priority ranges for filtering
  const priorityRanges = useMemo(() => [
    { key: 'high', label: 'High Priority (0-10)', min: 0, max: 10 },
    { key: 'medium', label: 'Medium Priority (11-30)', min: 11, max: 30 },
    { key: 'low', label: 'Low Priority (31+)', min: 31, max: 65535 },
    { key: 'na', label: 'N/A', min: null, max: null },
  ], []);

  // Check which priority ranges have records
  const availablePriorityRanges = useMemo(() => {
    const hasRecordsInRange = new Map<string, boolean>();
    
    // Priority range checking removed - priority is now part of the value field
    
    return priorityRanges.filter(range => hasRecordsInRange.get(range.key));
  }, [records, priorityRanges]);

  // Filter records based on search query, status, priority, and tags
  const filteredRecords = useMemo(() => {
    let filtered = records;
    
    // Apply search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(record => 
        record.name.toLowerCase().includes(query) ||
        record.type.toLowerCase().includes(query) ||
        record.value.toLowerCase().includes(query) ||
        (record.comment && record.comment.toLowerCase().includes(query))
      );
    }
    
    // Status filter removed - all DNS records are now active by default (active field removed from schema)
    
    // Priority filter removed - priority is now part of the value field (not a separate column)
    
    // Apply tag filter (OR logic - record must have at least one of the selected tags)
    if (activeTagIds.length > 0) {
      filtered = filtered.filter(record => {
        const assignment = recordTagAssignments.find(a => a.recordId === record.id);
        return activeTagIds.some(tagId => assignment?.tagIds?.includes(tagId) ?? false);
      });
    }
    
    return filtered;
  }, [records, searchQuery, statusFilters, priorityFilters, priorityRanges, activeTagIds, recordTagAssignments]);

  // Sort records
  const filteredAndSortedRecords = useMemo(() => {
    if (!sortKey || !sortDirection) return filteredRecords;
    
    return [...filteredRecords].sort((a, b) => {
      let aValue = a[sortKey];
      let bValue = b[sortKey];
      
      // Handle null/undefined
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;
      
      // Handle numbers
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      // Handle strings
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      return sortDirection === 'asc' 
        ? aStr.localeCompare(bStr) 
        : bStr.localeCompare(aStr);
    });
  }, [filteredRecords, sortKey, sortDirection]);

  // Handle select all checkbox
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      onSelectionChange(filteredAndSortedRecords.map(r => r.id));
    } else {
      onSelectionChange([]);
    }
  }, [onSelectionChange, filteredAndSortedRecords]);

  // Handle individual checkbox
  const handleSelectRecord = useCallback((recordId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedRecords, recordId]);
    } else {
      onSelectionChange(selectedRecords.filter(id => id !== recordId));
    }
  }, [selectedRecords, onSelectionChange]);

  // Handle column sort
  const handleSort = useCallback((key: keyof DNSRecord) => {
    if (sortKey === key) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortKey(null);
        setSortDirection('asc');
      }
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  }, [sortKey, sortDirection]);

  // Handle status filter toggle
  const handleStatusFilter = useCallback((status: string) => {
    setStatusFilters(prev => {
      const next = new Set(prev);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  }, []);

  // Handle priority filter toggle
  const handlePriorityFilter = useCallback((priority: string) => {
    setPriorityFilters(prev => {
      const next = new Set(prev);
      if (next.has(priority)) {
        next.delete(priority);
      } else {
        next.add(priority);
      }
      return next;
    });
  }, []);

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    setStatusFilters(new Set());
    setPriorityFilters(new Set());
  }, []);

  // Calculate active filter count (includes tag filters)
  const activeFilterCount = statusFilters.size + priorityFilters.size + activeTagIds.length;

  // Check if all visible records are selected
  const allSelected = filteredAndSortedRecords.length > 0 && 
    filteredAndSortedRecords.every(r => selectedRecords.includes(r.id));
  const someSelected = selectedRecords.length > 0 && !allSelected;

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
        ))}
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
          No DNS records
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Get started by creating your first DNS record.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <input
          type="search"
          placeholder="Search records by name, type, or value..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 pl-10 rounded-md border border-gray-light dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange transition-colors"
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      {/* Export Button */}
      <div className="flex justify-end">
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

      {/* Filters - Hidden for now (not filtering anything currently)
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-light dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <svg 
                className={clsx(
                  "w-4 h-4 transition-transform",
                  showFilters && "rotate-180"
                )}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              Filters
              {activeFilterCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-semibold text-white bg-orange rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </button>
            {activeFilterCount > 0 && (
              <button
                onClick={handleClearFilters}
                className="text-sm text-orange hover:text-orange-dark dark:hover:text-orange-light transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {showFilters && (
          <div className="inline-block bg-gray-50 dark:bg-gray-800 border border-gray-light dark:border-gray-600 rounded-lg p-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex flex-col md:flex-row md:gap-8 gap-3">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Status
                </h4>
                <div className="space-y-1.5">
                  {['Active', 'Inactive'].map(status => (
                    <label
                      key={status}
                      className="flex items-center gap-2 group"
                    >
                      <input
                        type="checkbox"
                        checked={statusFilters.has(status)}
                        onChange={() => handleStatusFilter(status)}
                        className="w-4 h-4 text-orange bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-orange focus:ring-2 cursor-pointer"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-orange dark:group-hover:text-orange transition-colors cursor-pointer">
                        {status}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Priority
                </h4>
                <div className="space-y-1.5">
                  {availablePriorityRanges.map(range => (
                    <label
                      key={range.key}
                      className="flex items-center gap-2 group"
                    >
                      <input
                        type="checkbox"
                        checked={priorityFilters.has(range.key)}
                        onChange={() => handlePriorityFilter(range.key)}
                        className="w-4 h-4 text-orange bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-orange focus:ring-2 cursor-pointer"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-orange dark:group-hover:text-orange transition-colors cursor-pointer">
                        {range.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      */}

      {/* Tag Filter Bar */}
      {activeTagIds.length > 0 && (
        <div className="flex items-center justify-between p-3 bg-orange/10 rounded-lg">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-slate dark:text-gray-300">Filtering by:</span>
            {activeTagIds.map(tagId => {
              const tag = tags.find(t => t.id === tagId);
              if (!tag) return null;
              return (
                <TagBadge
                  key={tag.id}
                  name={tag.name}
                  color={tag.color}
                  size="sm"
                  showRemove
                  onRemove={() => onTagClick?.(tag.id)}
                />
              );
            })}
            <span className="text-sm text-gray-slate dark:text-gray-400">
              ({filteredRecords.length} {filteredRecords.length === 1 ? 'record' : 'records'})
            </span>
          </div>
          <button
            onClick={() => onClearTagFilters?.()}
            className="text-sm text-orange hover:text-orange-dark flex items-center gap-1 transition-colors flex-shrink-0"
          >
            Clear all
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Empty state when tag filter has no matches */}
      {activeTagIds.length > 0 && filteredAndSortedRecords.length === 0 && (
        <div className="text-center py-12 border border-dashed border-gray-light dark:border-gray-700 rounded-lg">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
            No records match this filter
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Try selecting different tags or clear the filter.
          </p>
          <button
            onClick={() => onClearTagFilters?.()}
            className="mt-4 text-sm text-orange hover:text-orange-dark font-medium"
          >
            Clear tag filter
          </button>
        </div>
      )}

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-light dark:border-gray-700">
              <th className="py-3 px-4 w-12">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="w-4 h-4 text-orange bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded focus:ring-orange focus:ring-2 cursor-pointer"
                />
              </th>
              {[
                { key: 'name' as keyof DNSRecord | null, label: 'Name', sortable: true },
                { key: 'type' as keyof DNSRecord | null, label: 'Type', sortable: true },
                { key: 'value' as keyof DNSRecord | null, label: 'Value', sortable: true },
                { key: null as keyof DNSRecord | null, label: 'Tags', sortable: false },
                { key: 'ttl' as keyof DNSRecord | null, label: 'TTL', sortable: true },
              ].map(column => (
                <th
                  key={column.key || column.label}
                  className={clsx(
                    'text-left py-3 px-4 text-sm font-semibold transition-colors select-none',
                    column.sortable && 'cursor-pointer hover:text-orange dark:hover:text-orange',
                    column.key && sortKey === column.key
                      ? 'text-orange-dark dark:text-orange'
                      : 'text-gray-700 dark:text-gray-300'
                  )}
                  onClick={() => column.sortable && column.key && handleSort(column.key)}
                >
                  <div className="flex items-center gap-2">
                    {column.label}
                    {column.key && sortKey === column.key && (
                      <span className="text-orange">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedRecords.map((record) => {
              const isSelected = selectedRecords.includes(record.id);
              const fqdn = record.name === '@' || record.name === '' 
                ? zoneName 
                : `${record.name}.${zoneName}`;
              
              return (
                <tr
                  key={record.id}
                  className={clsx(
                    'border-b border-gray-light dark:border-gray-700 transition-colors cursor-pointer',
                    isSelected
                      ? 'bg-orange/10 dark:bg-orange/20'
                      : 'hover:bg-gray-light/30 dark:hover:bg-gray-700/30'
                  )}
                  onClick={() => onRecordClick(record)}
                >
                  <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => handleSelectRecord(record.id, e.target.checked)}
                      className="w-4 h-4 text-orange bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded focus:ring-orange focus:ring-2 cursor-pointer"
                    />
                  </td>
                  <td className="py-3 px-4">
                    <Tooltip content={fqdn}>
                      <span className="text-sm font-medium text-orange-dark dark:text-orange">
                        {record.name || '@'}
                      </span>
                    </Tooltip>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 bg-blue-electric/10 dark:bg-blue-electric/20 text-blue-electric dark:text-blue-electric rounded text-xs font-medium">
                      {record.type}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <Tooltip content={record.value}>
                      <span className="text-sm text-gray-slate dark:text-gray-300 font-mono truncate block max-w-md">
                        {record.value}
                      </span>
                    </Tooltip>
                  </td>
                  {/* Tags Column */}
                  <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1 flex-wrap">
                      {(() => {
                        const recordTags = getTagsForRecord(record.id, recordTagAssignments, tags);
                        const displayTags = recordTags.slice(0, 3);
                        const remainingCount = recordTags.length - 3;
                        
                        return (
                          <>
                            {displayTags.map(tag => (
                              <TagBadge
                                key={tag.id}
                                name={tag.name}
                                color={tag.color}
                                size="sm"
                                onClick={() => onTagClick?.(tag.id)}
                              />
                            ))}
                            {remainingCount > 0 && (
                              <span className="text-xs text-gray-slate dark:text-gray-400">
                                +{remainingCount}
                              </span>
                            )}
                            {onAssignTags && (
                              <button
                                onClick={() => onAssignTags(record.id, record.name || '@')}
                                className="p-1 rounded hover:bg-gray-light dark:hover:bg-gray-700 transition-colors"
                                title="Assign tags"
                              >
                                <svg className="w-4 h-4 text-gray-400 hover:text-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                              </button>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-slate dark:text-gray-300">
                    {record.ttl}s
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {filteredAndSortedRecords.map((record) => {
          const isSelected = selectedRecords.includes(record.id);
          const fqdn = record.name === '@' || record.name === '' 
            ? zoneName 
            : `${record.name}.${zoneName}`;
          
          return (
            <div
              key={record.id}
              className={clsx(
                'border rounded-lg p-4 transition-colors cursor-pointer',
                isSelected
                  ? 'border-orange bg-orange/10 dark:bg-orange/20'
                  : 'border-gray-light dark:border-gray-700 hover:border-orange dark:hover:border-orange'
              )}
              onClick={() => onRecordClick(record)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => handleSelectRecord(record.id, e.target.checked)}
                    className="w-4 h-4 text-orange bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded focus:ring-orange focus:ring-2 cursor-pointer"
                  />
                  <div>
                    <div className="text-sm font-medium text-orange-dark dark:text-orange">
                      {record.name || '@'}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {fqdn}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-blue-electric/10 dark:bg-blue-electric/20 text-blue-electric dark:text-blue-electric rounded text-xs font-medium">
                    {record.type}
                  </span>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Value:</span>
                  <div className="text-gray-900 dark:text-gray-100 font-mono break-all mt-1">
                    {record.value}
                  </div>
                </div>
                {/* Tags in Mobile View */}
                {tags.length > 0 && (
                  <div onClick={(e) => e.stopPropagation()}>
                    <span className="text-gray-500 dark:text-gray-400">Tags:</span>
                    <div className="flex items-center gap-1 flex-wrap mt-1">
                      {(() => {
                        const recordTags = getTagsForRecord(record.id, recordTagAssignments, tags);
                        const displayTags = recordTags.slice(0, 3);
                        const remainingCount = recordTags.length - 3;
                        
                        return (
                          <>
                            {displayTags.length === 0 ? (
                              <span className="text-xs text-gray-400 dark:text-gray-500 italic">No tags</span>
                            ) : (
                              <>
                                {displayTags.map(tag => (
                                  <TagBadge
                                    key={tag.id}
                                    name={tag.name}
                                    color={tag.color}
                                    size="sm"
                                    onClick={() => onTagClick?.(tag.id)}
                                  />
                                ))}
                                {remainingCount > 0 && (
                                  <span className="text-xs text-gray-slate dark:text-gray-400">
                                    +{remainingCount}
                                  </span>
                                )}
                              </>
                            )}
                            {onAssignTags && (
                              <button
                                onClick={() => onAssignTags(record.id, record.name || '@')}
                                className="p-1 rounded hover:bg-gray-light dark:hover:bg-gray-700 transition-colors"
                                title="Assign tags"
                              >
                                <svg className="w-4 h-4 text-gray-400 hover:text-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                              </button>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                  <span>TTL: {record.ttl}s</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Results count */}
      {(filteredAndSortedRecords.length !== records.length || activeFilterCount > 0) && (
        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          Showing {filteredAndSortedRecords.length} of {records.length} records
          {activeFilterCount > 0 && ` (${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''} applied)`}
        </div>
      )}
    </div>
  );
}

