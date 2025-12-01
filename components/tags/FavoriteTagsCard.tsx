'use client';

import { Card } from '@/components/ui/Card';
import { TagBadge } from '@/components/ui/TagBadge';
import type { Tag } from '@/lib/mock-tags-data';

interface FavoriteTagsCardProps {
  tags: Tag[];
  activeTagIds: string[];
  onTagClick: (tagId: string) => void;
  onClearFilters: () => void;
  onToggleFavorite: (tagId: string) => void;
}

export function FavoriteTagsCard({
  tags,
  activeTagIds,
  onTagClick,
  onClearFilters,
  onToggleFavorite,
}: FavoriteTagsCardProps) {
  const favoriteTags = tags.filter(tag => tag.isFavorite);
  const hasActiveFilters = activeTagIds.length > 0;

  return (
    <Card
      title="Favorite Tags"
      description="Quick access to your most used tags"
      action={
        hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="text-sm text-orange hover:text-orange-dark flex items-center gap-1 transition-colors"
          >
            Clear filter
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )
      }
    >
      {favoriteTags.length === 0 ? (
        <div className="text-center py-6">
          <svg
            className="w-10 h-10 text-gray-slate dark:text-gray-light mx-auto mb-3 opacity-50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
          <p className="text-gray-slate dark:text-gray-light text-sm">
            No favorite tags yet
          </p>
          <p className="text-gray-slate/70 dark:text-gray-500 text-xs mt-1">
            Star tags in the Tags panel to add them here
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {/* Active Filter Indicator */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 p-2 bg-orange/10 rounded-lg text-sm text-orange-dark dark:text-orange">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filtering by {activeTagIds.length} tag{activeTagIds.length > 1 ? 's' : ''}
            </div>
          )}

          {/* Tags Grid */}
          <div className="flex flex-wrap gap-2">
            {favoriteTags.map((tag) => {
              const isActive = activeTagIds.includes(tag.id);
              return (
                <div
                  key={tag.id}
                  className="group relative flex items-center"
                >
                  {/* Tag with selection indicator */}
                  <div className="relative">
                    <TagBadge
                      name={tag.name}
                      color={tag.color}
                      size="md"
                      onClick={() => onTagClick(tag.id)}
                    />
                    {/* Checkmark overlay for selected tags */}
                    {isActive && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange rounded-full flex items-center justify-center shadow-sm">
                        <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {/* Unfavorite button on hover */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(tag.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 ml-0.5 p-0.5 rounded hover:bg-gray-light dark:hover:bg-gray-600 transition-all"
                    title="Remove from favorites"
                  >
                    <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Usage hint */}
          <p className="text-xs text-gray-slate/70 dark:text-gray-500 mt-2">
            Click tags to filter zones (multi-select) • Hover to unfavorite
          </p>
        </div>
      )}
    </Card>
  );
}
