'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { TagBadge } from '@/components/ui/TagBadge';
import type { Tag, ZoneTagAssignment } from '@/lib/mock-tags-data';
import { getTagsForZone } from '@/lib/mock-tags-data';

interface Zone {
  id: string;
  name: string;
  environment_id: string;
  environment_name?: string;
  status?: 'active' | 'inactive';
  records_count?: number;
}

interface ZonesListProps {
  organizationId: string;
  zones: Zone[];
  // Tagging mockup props
  tags?: Tag[];
  assignments?: ZoneTagAssignment[];
  activeTagIds?: string[];
  onTagClick?: (tagId: string) => void;
  onClearFilters?: () => void;
  onAssignTags?: (zoneId: string, zoneName: string) => void;
  // Bulk assignment props
  onBulkAssignTags?: (zoneIds: string[], zoneNames: string[]) => void;
}

export function ZonesList({ 
  organizationId, 
  zones,
  tags = [],
  assignments = [],
  activeTagIds = [],
  onTagClick,
  onClearFilters,
  onAssignTags,
  onBulkAssignTags,
}: ZonesListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedZoneIds, setSelectedZoneIds] = useState<Set<string>>(new Set());
  const itemsPerPage = 8;

  // Reset to page 1 when activeTagIds changes from parent
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTagIds]);

  // Filter zones by active tags (show zones that have ANY of the selected tags)
  const filteredZones = activeTagIds.length > 0
    ? zones.filter(zone => {
        const assignment = assignments.find(a => a.zoneId === zone.id);
        if (!assignment?.tagIds) return false;
        // Zone matches if it has ANY of the selected tags
        return activeTagIds.some(tagId => assignment.tagIds.includes(tagId));
      })
    : zones;

  // Pagination logic
  const totalPages = Math.ceil(filteredZones.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedZones = filteredZones.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Get the active tag objects for display
  const activeTags = tags.filter(t => activeTagIds.includes(t.id));
  const hasActiveFilters = activeTagIds.length > 0;

  // Selection handlers for bulk actions
  const toggleZoneSelection = (zoneId: string) => {
    setSelectedZoneIds(prev => {
      const next = new Set(prev);
      if (next.has(zoneId)) {
        next.delete(zoneId);
      } else {
        next.add(zoneId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedZoneIds.size === filteredZones.length) {
      setSelectedZoneIds(new Set());
    } else {
      setSelectedZoneIds(new Set(filteredZones.map(z => z.id)));
    }
  };

  const clearSelection = () => {
    setSelectedZoneIds(new Set());
  };

  const handleBulkAssign = () => {
    if (onBulkAssignTags && selectedZoneIds.size > 0) {
      const selectedIds = Array.from(selectedZoneIds);
      const selectedNames = selectedIds.map(id => zones.find(z => z.id === id)?.name || '');
      onBulkAssignTags(selectedIds, selectedNames);
    }
  };

  const allSelected = filteredZones.length > 0 && selectedZoneIds.size === filteredZones.length;
  const someSelected = selectedZoneIds.size > 0 && selectedZoneIds.size < filteredZones.length;

  return (
    <Card
      title="Zones"
      description={hasActiveFilters ? `Filtered by ${activeTagIds.length} tag${activeTagIds.length > 1 ? 's' : ''}` : "All DNS zones"}
    >
      {/* Selection Toolbar */}
      {onBulkAssignTags && filteredZones.length > 0 && (
        <div className="flex items-center justify-between py-2 px-1 border-b border-gray-light dark:border-gray-700 mt-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <div
              onClick={toggleSelectAll}
              className={`
                w-5 h-5 rounded border-2 flex items-center justify-center transition-colors cursor-pointer
                ${allSelected
                  ? 'bg-orange border-orange'
                  : someSelected
                    ? 'bg-orange/50 border-orange'
                    : 'border-gray-400 dark:border-gray-500 hover:border-orange'
                }
              `}
            >
              {allSelected && (
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {someSelected && !allSelected && (
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" />
                </svg>
              )}
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {selectedZoneIds.size > 0 
                ? `${selectedZoneIds.size} selected` 
                : 'Select all'
              }
            </span>
          </label>
          
          {/* Floating action bar when zones are selected */}
          {selectedZoneIds.size > 0 && (
            <div className="flex items-center gap-3">
              <Button
                variant="primary"
                size="sm"
                onClick={handleBulkAssign}
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Assign Tags
              </Button>
              <button
                onClick={clearSelection}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}

      {/* Active Filter Bar */}
      {hasActiveFilters && activeTags.length > 0 && (
        <div className="flex items-center justify-between p-3 bg-orange/10 rounded-lg mb-4 mt-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-slate dark:text-gray-300">Filtering by:</span>
            {activeTags.map(tag => (
              <TagBadge 
                key={tag.id} 
                name={tag.name} 
                color={tag.color} 
                size="sm"
                onClick={() => onTagClick?.(tag.id)}
                showRemove
                onRemove={() => onTagClick?.(tag.id)}
              />
            ))}
            <span className="text-sm text-gray-slate dark:text-gray-400">
              ({filteredZones.length} {filteredZones.length === 1 ? 'zone' : 'zones'})
            </span>
          </div>
          <button
            onClick={() => onClearFilters?.()}
            className="text-sm text-orange hover:text-orange-dark flex items-center gap-1 transition-colors flex-shrink-0"
          >
            Clear all
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {zones.length === 0 ? (
        <div className="text-center py-12">
          <svg
            className="w-16 h-16 text-gray-slate dark:text-gray-light mx-auto mb-4 opacity-50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-gray-slate dark:text-gray-light text-sm">
            No zones yet. Add your first zone to get started.
          </p>
        </div>
      ) : filteredZones.length === 0 ? (
        <div className="text-center py-12">
          <svg
            className="w-16 h-16 text-gray-slate dark:text-gray-light mx-auto mb-4 opacity-50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <p className="text-gray-slate dark:text-gray-light text-sm mb-4">
            No zones match this filter.
          </p>
          <Button variant="secondary" size="sm" onClick={() => onClearFilters?.()}>
            Clear filter
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-3 mt-4">
            {paginatedZones.map((zone) => {
              const zoneTags = getTagsForZone(zone.id, assignments, tags);
              
              return (
                <div
                  key={zone.id}
                  className={`p-4 rounded-lg border transition-colors bg-white dark:bg-gray-800 ${
                    selectedZoneIds.has(zone.id)
                      ? 'border-orange bg-orange/5'
                      : 'border-gray-light dark:border-gray-600 hover:border-orange dark:hover:border-orange'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1 min-w-0">
                      {/* Selection Checkbox */}
                      {onBulkAssignTags && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleZoneSelection(zone.id);
                          }}
                          className={`
                            flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors cursor-pointer
                            ${selectedZoneIds.has(zone.id)
                              ? 'bg-orange border-orange'
                              : 'border-gray-400 dark:border-gray-500 hover:border-orange'
                            }
                          `}
                        >
                          {selectedZoneIds.has(zone.id) && (
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      )}

                      {/* Icon */}
                      <div className="flex-shrink-0">
                        <svg
                          className="w-5 h-5 text-blue-electric"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>

                      {/* Zone Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center flex-wrap gap-2 mb-1">
                          <h3 className="text-base font-bold text-orange-dark dark:text-orange truncate">
                            {zone.name}
                          </h3>
                          {/* Tag Badges */}
                          {zoneTags.map(tag => (
                            <TagBadge
                              key={tag.id}
                              name={tag.name}
                              color={tag.color}
                              size="sm"
                              onClick={() => onTagClick?.(tag.id)}
                              isActive={activeTagIds.includes(tag.id)}
                            />
                          ))}
                          {/* Add Tag Button */}
                          {onAssignTags && (
                            <button
                              onClick={() => onAssignTags(zone.id, zone.name)}
                              className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-dashed border-gray-400 text-gray-400 hover:border-orange hover:text-orange transition-colors"
                              title="Manage tags"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            </button>
                          )}
                        </div>
                        <div className="flex items-center space-x-4 text-xs text-gray-slate dark:text-gray-light">
                          <span className="flex items-center space-x-1">
                            <svg
                              className="w-4 h-4"
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
                            <span>{zone.records_count || 0} records</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* View Button */}
                    <div className="flex-shrink-0 ml-4">
                      <Link href={`/zone/${zone.id}`}>
                        <button className="px-4 py-2 text-sm font-medium text-orange hover:text-orange-dark dark:hover:text-orange border border-orange rounded-lg hover:bg-orange/5 transition-colors">
                          View →
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls - only show if more than 8 zones */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </Button>
              
              <span className="text-sm text-gray-600 dark:text-gray-400 font-medium px-4">
                Page {currentPage} of {totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
