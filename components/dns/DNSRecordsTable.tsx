'use client';

import { useState, useMemo, useCallback } from 'react';
import { clsx } from 'clsx';
import type { DNSRecord } from '@/types/dns';
import { RECORD_TYPE_INFO } from '@/types/dns';
import { Tooltip } from '@/components/ui/Tooltip';

interface DNSRecordsTableProps {
  records: DNSRecord[];
  selectedRecords: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  onRecordClick: (record: DNSRecord) => void;
  loading?: boolean;
  zoneName: string;
}

export function DNSRecordsTable({
  records,
  selectedRecords,
  onSelectionChange,
  onRecordClick,
  loading = false,
  zoneName,
}: DNSRecordsTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<keyof DNSRecord | null>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilters, setStatusFilters] = useState<Set<string>>(new Set());
  const [priorityFilters, setPriorityFilters] = useState<Set<string>>(new Set());

  // Handle select all checkbox
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      onSelectionChange(filteredAndSortedRecords.map(r => r.id));
    } else {
      onSelectionChange([]);
    }
  }, [onSelectionChange]);

  // Handle individual checkbox
  const handleSelectRecord = useCallback((recordId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedRecords, recordId]);
    } else {
      onSelectionChange(selectedRecords.filter(id => id !== recordId));
    }
  }, [selectedRecords, onSelectionChange]);

  // Define priority ranges for filtering
  const priorityRanges = [
    { key: 'high', label: 'High Priority (0-10)', min: 0, max: 10 },
    { key: 'medium', label: 'Medium Priority (11-30)', min: 11, max: 30 },
    { key: 'low', label: 'Low Priority (31+)', min: 31, max: 65535 },
    { key: 'na', label: 'N/A', min: null, max: null },
  ];

  // Check which priority ranges have records
  const availablePriorityRanges = useMemo(() => {
    const hasRecordsInRange = new Map<string, boolean>();
    
    priorityRanges.forEach(range => {
      const hasRecords = records.some(record => {
        if (range.key === 'na') {
          return record.priority === null || record.priority === undefined;
        }
        return record.priority !== null && 
               record.priority !== undefined && 
               record.priority >= range.min! && 
               record.priority <= range.max!;
      });
      hasRecordsInRange.set(range.key, hasRecords);
    });
    
    return priorityRanges.filter(range => hasRecordsInRange.get(range.key));
  }, [records]);

  // Filter records based on search query, status, and priority
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
    
    // Apply status filter (if any status is selected)
    if (statusFilters.size > 0) {
      filtered = filtered.filter(record => {
        const status = record.active ? 'Active' : 'Inactive';
        return statusFilters.has(status);
      });
    }
    
    // Apply priority filter (if any priority range is selected)
    if (priorityFilters.size > 0) {
      filtered = filtered.filter(record => {
        // Check if record matches any selected priority range
        return Array.from(priorityFilters).some(rangeKey => {
          const range = priorityRanges.find(r => r.key === rangeKey);
          if (!range) return false;
          
          if (range.key === 'na') {
            return record.priority === null || record.priority === undefined;
          }
          
          return record.priority !== null && 
                 record.priority !== undefined && 
                 record.priority >= range.min! && 
                 record.priority <= range.max!;
        });
      });
    }
    
    return filtered;
  }, [records, searchQuery, statusFilters, priorityFilters]);

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

  // Calculate active filter count
  const activeFilterCount = statusFilters.size + priorityFilters.size;

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

      {/* Filters */}
      <div className="space-y-3">
        {/* Filter Toggle Button */}
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
              className="text-sm text-orange hover:text-orange-dark transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-light dark:border-gray-600 rounded-lg p-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Status Filter */}
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

              {/* Priority Filter */}
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
                { key: 'name' as const, label: 'Name' },
                { key: 'type' as const, label: 'Type' },
                { key: 'value' as const, label: 'Value' },
                { key: 'ttl' as const, label: 'TTL' },
                { key: 'priority' as const, label: 'Priority' },
                { key: 'active' as const, label: 'Status' },
              ].map(column => (
                <th
                  key={column.key}
                  className={clsx(
                    'text-left py-3 px-4 text-sm font-semibold transition-colors cursor-pointer select-none hover:text-orange dark:hover:text-orange',
                    sortKey === column.key
                      ? 'text-orange-dark dark:text-orange'
                      : 'text-gray-700 dark:text-gray-300'
                  )}
                  onClick={() => handleSort(column.key)}
                >
                  <div className="flex items-center gap-2">
                    {column.label}
                    {sortKey === column.key && (
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
                  <td className="py-3 px-4 text-sm text-gray-slate dark:text-gray-300">
                    {record.ttl}s
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-slate dark:text-gray-300">
                    {RECORD_TYPE_INFO[record.type].requiresPriority 
                      ? (record.priority ?? 'N/A')
                      : 'N/A'}
                  </td>
                  <td className="py-3 px-4">
                    <span className={clsx(
                      'px-2 py-1 rounded text-xs font-medium',
                      record.active
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    )}>
                      {record.active ? 'Active' : 'Inactive'}
                    </span>
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
                  <span className={clsx(
                    'px-2 py-1 rounded text-xs font-medium',
                    record.active
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                  )}>
                    {record.active ? 'Active' : 'Inactive'}
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
                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                  <span>TTL: {record.ttl}s</span>
                  {RECORD_TYPE_INFO[record.type].requiresPriority && (
                    <span>Priority: {record.priority ?? 'N/A'}</span>
                  )}
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

